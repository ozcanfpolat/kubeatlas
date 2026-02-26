import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Server,
  MoreVertical,
  RefreshCw,
  Trash,
  Edit,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clustersApi } from '@/api'
import { getStatusColor, getEnvironmentColor, formatRelativeTime } from '@/lib/utils'
import type { Cluster } from '@/types'

export default function Clusters() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [envFilter, setEnvFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['clusters', { search, status: statusFilter, environment: envFilter }],
    queryFn: () =>
      clustersApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        environment: envFilter || undefined,
        page_size: 100,
      }),
  })

  const syncMutation = useMutation({
    mutationFn: (id: string) => clustersApi.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clustersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
    },
  })

  const clusters = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clusters</h1>
          <p className="text-muted-foreground">
            Manage your Kubernetes clusters
          </p>
        </div>
        <Button onClick={() => navigate('/clusters/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cluster
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clusters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="syncing">Syncing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cluster Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No clusters found</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter || envFilter
                ? 'Try adjusting your filters'
                : 'Add your first cluster to get started'}
            </p>
            {!search && !statusFilter && !envFilter && (
              <Button onClick={() => navigate('/clusters/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cluster
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onSync={() => syncMutation.mutate(cluster.id)}
              onDelete={() => deleteMutation.mutate(cluster.id)}
              onClick={() => navigate(`/clusters/${cluster.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ClusterCardProps {
  cluster: Cluster
  onSync: () => void
  onDelete: () => void
  onClick: () => void
}

function ClusterCard({ cluster, onSync, onDelete, onClick }: ClusterCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{cluster.display_name || cluster.name}</h3>
              <p className="text-xs text-muted-foreground">{cluster.cluster_type}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onSync()
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={getEnvironmentColor(cluster.environment)}>
            {cluster.environment}
          </Badge>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(cluster.status)}`} />
            <span className="text-xs text-muted-foreground">{cluster.status}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Namespaces</p>
            <p className="font-semibold">{cluster.namespace_count}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nodes</p>
            <p className="font-semibold">{cluster.node_count}</p>
          </div>
        </div>

        {cluster.last_sync_at && (
          <p className="mt-4 text-xs text-muted-foreground">
            Last synced {formatRelativeTime(cluster.last_sync_at)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
