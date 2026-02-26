import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  RefreshCw, 
  Server, 
  Box, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Edit,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { clustersApi } from '@/api'
import { 
  formatDateTime, 
  formatRelativeTime, 
  getStatusColor, 
  getEnvironmentColor,
  getClusterTypeIcon 
} from '@/lib/utils'

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: cluster, isLoading } = useQuery({
    queryKey: ['cluster', id],
    queryFn: () => clustersApi.getById(id!),
    enabled: !!id,
  })

  const { data: namespacesData } = useQuery({
    queryKey: ['cluster-namespaces', id],
    queryFn: () => clustersApi.getNamespaces(id!, { page: 1, page_size: 100 }),
    enabled: !!id,
  })

  const syncMutation = useMutation({
    mutationFn: () => clustersApi.sync(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster', id] })
      queryClient.invalidateQueries({ queryKey: ['cluster-namespaces', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!cluster) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cluster bulunamadı</p>
        <Link to="/clusters">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </Link>
      </div>
    )
  }

  const namespaces = namespacesData?.data || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/clusters">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getClusterTypeIcon(cluster.cluster_type)}</span>
              <h1 className="text-2xl font-bold">
                {cluster.display_name || cluster.name}
              </h1>
              <Badge className={getStatusColor(cluster.status)}>
                {cluster.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {cluster.api_server_url}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Senkronize Et
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cluster.node_count}</p>
                <p className="text-xs text-muted-foreground">Node</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Box className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cluster.namespace_count}</p>
                <p className="text-xs text-muted-foreground">Namespace</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{cluster.version || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Versiyon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {cluster.last_sync_at ? formatRelativeTime(cluster.last_sync_at) : 'Hiç'}
                </p>
                <p className="text-xs text-muted-foreground">Son Sync</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="namespaces">
        <TabsList>
          <TabsTrigger value="namespaces">Namespace'ler ({namespaces.length})</TabsTrigger>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
        </TabsList>

        <TabsContent value="namespaces" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium">Namespace</th>
                      <th className="text-left p-4 font-medium">Environment</th>
                      <th className="text-left p-4 font-medium">Criticality</th>
                      <th className="text-left p-4 font-medium">Owner</th>
                      <th className="text-left p-4 font-medium">Durum</th>
                      <th className="text-right p-4 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {namespaces.map((ns) => (
                      <tr key={ns.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <Link 
                            to={`/namespaces/${ns.id}`}
                            className="font-mono text-sm hover:text-primary"
                          >
                            {ns.name}
                          </Link>
                        </td>
                        <td className="p-4">
                          {ns.environment ? (
                            <Badge variant="outline" className={getEnvironmentColor(ns.environment)}>
                              {ns.environment}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`${
                            ns.criticality === 'tier-1' ? 'text-red-500 border-red-500/30' :
                            ns.criticality === 'tier-2' ? 'text-yellow-500 border-yellow-500/30' :
                            'text-green-500 border-green-500/30'
                          }`}>
                            {ns.criticality}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {ns.infrastructure_owner_team_id ? (
                            <span className="text-sm">
                              {ns.infrastructure_owner_team?.name || 'Atandı'}
                            </span>
                          ) : (
                            <span className="text-sm text-yellow-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Sahipsiz
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(ns.status)}>
                            {ns.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Link to={`/namespaces/${ns.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {namespaces.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Henüz namespace yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cluster Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="font-medium capitalize">{cluster.cluster_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium">{cluster.platform || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-medium">{cluster.region || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <Badge variant="outline" className={getEnvironmentColor(cluster.environment)}>
                    {cluster.environment}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TLS Doğrulama</span>
                  <span className="font-medium">
                    {cluster.skip_tls_verify ? 'Atlandı' : 'Aktif'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bağlantı Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-muted-foreground text-sm">API Server</span>
                  <p className="font-mono text-sm mt-1 break-all">{cluster.api_server_url}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Oluşturulma</span>
                  <span className="text-sm">{formatDateTime(cluster.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Son Güncelleme</span>
                  <span className="text-sm">{formatDateTime(cluster.updated_at)}</span>
                </div>
                {cluster.sync_error && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="text-sm text-red-500">{cluster.sync_error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Cluster ayarları yakında...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
