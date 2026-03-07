import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  GitBranch,
  Plus,
  Search,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  Network,
  RefreshCw,
  Trash2,
  Server,
  Database,
  Cloud,
  Layers,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { dependenciesApi, namespacesApi, clustersApi } from '@/api'
import type { InternalDependency, ExternalDependency, Cluster, Namespace } from '@/types'

const dependencyTypeConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  api: { color: 'text-blue-500', bgColor: 'bg-blue-500', icon: Zap, label: 'API' },
  database: { color: 'text-green-500', bgColor: 'bg-green-500', icon: Database, label: 'Database' },
  queue: { color: 'text-purple-500', bgColor: 'bg-purple-500', icon: Layers, label: 'Queue' },
  cache: { color: 'text-orange-500', bgColor: 'bg-orange-500', icon: Server, label: 'Cache' },
  storage: { color: 'text-cyan-500', bgColor: 'bg-cyan-500', icon: Database, label: 'Storage' },
  saas: { color: 'text-pink-500', bgColor: 'bg-pink-500', icon: Cloud, label: 'SaaS' },
  'payment-gateway': { color: 'text-red-500', bgColor: 'bg-red-500', icon: Globe, label: 'Payment' },
}

// Dependency Node Component for Graph View
const DependencyNode = ({ 
  namespace, 
  internalDeps, 
  externalDeps, 
  allNamespaces,
  onDeleteInternal,
  onDeleteExternal,
}: { 
  namespace: Namespace
  internalDeps: InternalDependency[]
  externalDeps: ExternalDependency[]
  allNamespaces: Namespace[]
  onDeleteInternal: (id: string) => void
  onDeleteExternal: (id: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const getNamespaceName = (id: string) => {
    const ns = allNamespaces.find(n => n.id === id)
    return ns?.name || id.slice(0, 8)
  }

  const totalDeps = internalDeps.length + externalDeps.length
  const criticalCount = [...internalDeps, ...externalDeps].filter(d => d.is_critical).length

  if (totalDeps === 0) return null

  return (
    <div className="relative">
      {/* Main Node Card */}
      <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all shadow-lg hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{namespace.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalDeps} bağımlılık {criticalCount > 0 && `• ${criticalCount} kritik`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {/* Visual Dependency Flow */}
            <div className="relative">
              {/* Internal Dependencies */}
              {internalDeps.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-500">Internal Dependencies</span>
                  </div>
                  <div className="grid gap-2">
                    {internalDeps.map((dep) => {
                      const config = dependencyTypeConfig[dep.dependency_type] || dependencyTypeConfig.api
                      const IconComponent = config.icon
                      return (
                        <div
                          key={dep.id}
                          className="group relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/80 to-muted/40 hover:from-primary/10 hover:to-primary/5 transition-all"
                        >
                          {/* Connection Line Visual */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full" />
                          
                          <div className={`p-2 rounded-lg ${config.bgColor}/10`}>
                            <IconComponent className={`h-4 w-4 ${config.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${config.color} border-current/30 text-xs`}>
                                {config.label}
                              </Badge>
                              {dep.is_critical && (
                                <Badge variant="destructive" className="text-xs">Kritik</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">
                                {getNamespaceName(dep.target_namespace_id)}
                              </span>
                            </div>
                            {dep.description && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {dep.description}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDeleteInternal(dep.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* External Dependencies */}
              {externalDeps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ExternalLink className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-500">External Dependencies</span>
                  </div>
                  <div className="grid gap-2">
                    {externalDeps.map((dep) => {
                      const config = dependencyTypeConfig[dep.system_type] || dependencyTypeConfig.saas
                      const IconComponent = config.icon
                      return (
                        <div
                          key={dep.id}
                          className="group relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10 transition-all"
                        >
                          {/* Connection Line Visual */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500/50 to-purple-500/20 rounded-full" />
                          
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <IconComponent className="h-4 w-4 text-purple-500" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{dep.name}</span>
                              {dep.is_critical && (
                                <Badge variant="destructive" className="text-xs">Kritik</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-purple-500 border-purple-500/30 text-xs">
                                {dep.system_type?.toUpperCase() || 'EXTERNAL'}
                              </Badge>
                              {dep.endpoint && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {dep.endpoint}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDeleteExternal(dep.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default function Dependencies() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false)
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for internal dependency
  const [internalForm, setInternalForm] = useState({
    source_namespace_id: '',
    target_namespace_id: '',
    dependency_type: 'api',
    description: '',
    is_critical: false,
  })

  // Form state for external dependency
  const [externalForm, setExternalForm] = useState({
    namespace_id: '',
    name: '',
    system_type: 'saas',
    description: '',
    endpoint: '',
    is_critical: false,
  })

  const { data: internalDeps, isLoading: loadingInternal, isError, refetch } = useQuery({
    queryKey: ['internal-dependencies'],
    queryFn: () => dependenciesApi.listInternal({ page: 1, page_size: 500 }),
    retry: 1,
  })

  const { data: externalDeps, isLoading: loadingExternal } = useQuery({
    queryKey: ['external-dependencies'],
    queryFn: dependenciesApi.listExternalAll,
    retry: 1,
  })

  // All namespaces for display
  const { data: allNamespacesData } = useQuery({
    queryKey: ['all-namespaces-deps'],
    queryFn: () => namespacesApi.list({ page: 1, page_size: 500 }),
  })

  // Filtered namespaces for form (based on cluster filter)
  const { data: filteredNamespacesData } = useQuery({
    queryKey: ['filtered-namespaces-deps', clusterFilter],
    queryFn: () => namespacesApi.list({ 
      page: 1, 
      page_size: 500,
      cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
    }),
  })

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-deps'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const namespaces: Namespace[] = allNamespacesData?.items || []
  const formNamespaces: Namespace[] = filteredNamespacesData?.items || []
  const clusters: Cluster[] = clustersData?.items || []

  const createInternalMutation = useMutation({
    mutationFn: (data: any) => dependenciesApi.createInternal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-dependencies'] })
      setIsAddInternalOpen(false)
      setInternalForm({
        source_namespace_id: '',
        target_namespace_id: '',
        dependency_type: 'api',
        description: '',
        is_critical: false,
      })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create internal dependency')
    },
  })

  const createExternalMutation = useMutation({
    mutationFn: (data: any) => dependenciesApi.createExternal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-dependencies'] })
      setIsAddExternalOpen(false)
      setExternalForm({
        namespace_id: '',
        name: '',
        system_type: 'saas',
        description: '',
        endpoint: '',
        is_critical: false,
      })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create external dependency')
    },
  })

  const deleteInternalMutation = useMutation({
    mutationFn: (id: string) => dependenciesApi.deleteInternal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-dependencies'] })
    },
  })

  const deleteExternalMutation = useMutation({
    mutationFn: (id: string) => dependenciesApi.deleteExternal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-dependencies'] })
    },
  })

  const isLoading = loadingInternal || loadingExternal

  // Group dependencies by source namespace
  const groupedDependencies = useMemo(() => {
    const internalList: InternalDependency[] = internalDeps?.items || []
    const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
    
    const groups: Map<string, { namespace: Namespace; internal: InternalDependency[]; external: ExternalDependency[] }> = new Map()
    
    // Group internal dependencies by source
    internalList.forEach(dep => {
      const ns = namespaces.find(n => n.id === dep.source_namespace_id)
      if (ns) {
        if (!groups.has(ns.id)) {
          groups.set(ns.id, { namespace: ns, internal: [], external: [] })
        }
        groups.get(ns.id)!.internal.push(dep)
      }
    })
    
    // Group external dependencies by namespace
    externalList.forEach(dep => {
      const ns = namespaces.find(n => n.id === dep.namespace_id)
      if (ns) {
        if (!groups.has(ns.id)) {
          groups.set(ns.id, { namespace: ns, internal: [], external: [] })
        }
        groups.get(ns.id)!.external.push(dep)
      }
    })
    
    return Array.from(groups.values())
      .filter(g => {
        // Apply cluster filter
        if (clusterFilter !== 'all' && g.namespace.cluster_id !== clusterFilter) return false
        // Apply search filter
        if (searchQuery && !g.namespace.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        // Sort by total dependencies count
        const countA = a.internal.length + a.external.length
        const countB = b.internal.length + b.external.length
        return countB - countA
      })
  }, [internalDeps, externalDeps, namespaces, clusterFilter, searchQuery])

  // Stats
  const internalList: InternalDependency[] = internalDeps?.items || []
  const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
  const totalInternal = internalList.length
  const totalExternal = externalList.length
  const criticalCount = [...internalList, ...externalList].filter(d => d.is_critical).length

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dependencies</h1>
            <p className="text-muted-foreground">Manage internal and external service dependencies</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load dependencies</h3>
            <p className="text-muted-foreground mb-4">There was an error loading the data.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dependencies
          </h1>
          <p className="text-muted-foreground">Servis bağımlılıklarını görsel olarak yönetin</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'graph' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('graph')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsAddInternalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Internal
          </Button>
          <Button onClick={() => setIsAddExternalOpen(true)} variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            External
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <GitBranch className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{totalInternal}</p>
                <p className="text-sm text-muted-foreground">Internal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <ExternalLink className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-500">{totalExternal}</p>
                <p className="text-sm text-muted-foreground">External</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-500">{criticalCount}</p>
                <p className="text-sm text-muted-foreground">Kritik</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Network className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500">{groupedDependencies.length}</p>
                <p className="text-sm text-muted-foreground">Namespace</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Namespace ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tüm Clusterlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Clusterlar</SelectItem>
            {clusters.map((cluster) => (
              <SelectItem key={cluster.id} value={cluster.id}>
                {cluster.display_name || cluster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Graph View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : groupedDependencies.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Network className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Henüz bağımlılık yok</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Namespace'leriniz arasında bağımlılık tanımlayarak servislerin birbirleriyle nasıl iletişim kurduğunu takip edin.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setIsAddInternalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Internal Bağımlılık Ekle
              </Button>
              <Button onClick={() => setIsAddExternalOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                External Bağımlılık Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groupedDependencies.map(({ namespace, internal, external }) => (
            <DependencyNode
              key={namespace.id}
              namespace={namespace}
              internalDeps={internal}
              externalDeps={external}
              allNamespaces={namespaces}
              onDeleteInternal={(id) => deleteInternalMutation.mutate(id)}
              onDeleteExternal={(id) => deleteExternalMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {groupedDependencies.length > 0 && (
        <Card className="mt-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bağımlılık Türleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(dependencyTypeConfig).map(([key, config]) => {
                const IconComponent = config.icon
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.bgColor}/10`}>
                      <IconComponent className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <span className="text-sm">{config.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Internal Dependency Dialog */}
      <Dialog open={isAddInternalOpen} onOpenChange={setIsAddInternalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-500" />
              Internal Bağımlılık Ekle
            </DialogTitle>
            <DialogDescription>
              Namespace'ler arasında internal bağımlılık tanımlayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kaynak Namespace *</Label>
                <Select
                  value={internalForm.source_namespace_id}
                  onValueChange={(v) => setInternalForm({ ...internalForm, source_namespace_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {formNamespaces.map((ns) => (
                      <SelectItem key={ns.id} value={ns.id}>
                        {ns.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hedef Namespace *</Label>
                <Select
                  value={internalForm.target_namespace_id}
                  onValueChange={(v) => setInternalForm({ ...internalForm, target_namespace_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {formNamespaces.map((ns) => (
                      <SelectItem key={ns.id} value={ns.id}>
                        {ns.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bağımlılık Türü</Label>
              <Select
                value={internalForm.dependency_type}
                onValueChange={(v) => setInternalForm({ ...internalForm, dependency_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="queue">Queue</SelectItem>
                  <SelectItem value="cache">Cache</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                placeholder="Bağımlılık hakkında not..."
                value={internalForm.description}
                onChange={(e) => setInternalForm({ ...internalForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal-critical"
                checked={internalForm.is_critical}
                onCheckedChange={(checked) => setInternalForm({ ...internalForm, is_critical: !!checked })}
              />
              <Label htmlFor="internal-critical" className="text-sm">
                Kritik bağımlılık olarak işaretle
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInternalOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createInternalMutation.mutate(internalForm)}
              disabled={!internalForm.source_namespace_id || !internalForm.target_namespace_id || createInternalMutation.isPending}
            >
              {createInternalMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Dependency Dialog */}
      <Dialog open={isAddExternalOpen} onOpenChange={setIsAddExternalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-purple-500" />
              External Bağımlılık Ekle
            </DialogTitle>
            <DialogDescription>
              Dış sistemlere olan bağımlılıkları tanımlayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Namespace *</Label>
              <Select
                value={externalForm.namespace_id}
                onValueChange={(v) => setExternalForm({ ...externalForm, namespace_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Namespace seçin" />
                </SelectTrigger>
                <SelectContent>
                  {formNamespaces.map((ns) => (
                    <SelectItem key={ns.id} value={ns.id}>
                      {ns.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Servis Adı *</Label>
                <Input
                  placeholder="örn: Stripe, AWS S3"
                  value={externalForm.name}
                  onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sistem Türü</Label>
                <Select
                  value={externalForm.system_type}
                  onValueChange={(v) => setExternalForm({ ...externalForm, system_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="payment-gateway">Payment Gateway</SelectItem>
                    <SelectItem value="api">External API</SelectItem>
                    <SelectItem value="database">External Database</SelectItem>
                    <SelectItem value="storage">Cloud Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://api.example.com"
                value={externalForm.endpoint}
                onChange={(e) => setExternalForm({ ...externalForm, endpoint: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                placeholder="Bu bağımlılık hakkında not..."
                value={externalForm.description}
                onChange={(e) => setExternalForm({ ...externalForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="external-critical"
                checked={externalForm.is_critical}
                onCheckedChange={(checked) => setExternalForm({ ...externalForm, is_critical: !!checked })}
              />
              <Label htmlFor="external-critical" className="text-sm">
                Kritik bağımlılık olarak işaretle
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExternalOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createExternalMutation.mutate(externalForm)}
              disabled={!externalForm.namespace_id || !externalForm.name || createExternalMutation.isPending}
            >
              {createExternalMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
