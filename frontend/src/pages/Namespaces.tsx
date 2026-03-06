import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Boxes,
  Download,
  AlertTriangle,
  FileText,
  GitBranch,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { namespacesApi, clustersApi } from '@/api'
import { getEnvironmentColor, getCriticalityColor, formatRelativeTime } from '@/lib/utils'
import type { Namespace, Cluster } from '@/types'

export default function Namespaces() {
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [envFilter, setEnvFilter] = useState<string>('all')
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all')
  const [orphanedFilter, setOrphanedFilter] = useState(false)
  const [page, setPage] = useState(1)

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-list'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
    retry: 1,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['namespaces', { search, clusterFilter, envFilter, criticalityFilter, orphanedFilter, page }],
    queryFn: () =>
      namespacesApi.list({
        search: search || undefined,
        cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
        environment: envFilter === 'all' ? undefined : envFilter,
        criticality: criticalityFilter === 'all' ? undefined : criticalityFilter,
        orphaned: orphanedFilter || undefined,
        page,
        page_size: 20,
      }),
    retry: 1,
  })

  // Defensive: ensure arrays are always arrays
  const clusterList: Cluster[] = Array.isArray(clustersData?.items) ? clustersData.items : []
  const namespaces: Namespace[] = Array.isArray(data?.items) ? data.items : []
  const total = data?.total || 0
  const totalPages = data?.total_pages || 1

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Namespaces</h1>
            <p className="text-muted-foreground">Namespaces across all clusters</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load namespaces</h3>
            <p className="text-muted-foreground mb-4">There was an error loading the namespace data.</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Namespaces</h1>
          <p className="text-muted-foreground">
            {total} namespaces across all clusters
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search namespaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Clusters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {clusterList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.display_name || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Criticality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="tier-1">Tier 1 (Critical)</SelectItem>
            <SelectItem value="tier-2">Tier 2 (Important)</SelectItem>
            <SelectItem value="tier-3">Tier 3 (Standard)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={orphanedFilter ? 'default' : 'outline'}
          onClick={() => setOrphanedFilter(!orphanedFilter)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Orphaned Only
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Namespace</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cluster</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Environment</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Criticality</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <tr key={i} className="border-b">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-6 bg-muted animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : namespaces.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Boxes className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No namespaces found</p>
                </td>
              </tr>
            ) : (
              namespaces.map((ns) => (
                <tr
                  key={ns.id}
                  className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/namespaces/${ns.id}`)}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Boxes className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{ns.name}</p>
                        {ns.display_name && (
                          <p className="text-xs text-muted-foreground">{ns.display_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {(() => {
                      const cluster = clusterList.find(c => c.id === ns.cluster_id)
                      return cluster?.display_name || cluster?.name || '-'
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    {ns.environment ? (
                      <Badge className={getEnvironmentColor(ns.environment)}>
                        {ns.environment}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {ns.criticality ? (
                      <Badge className={getCriticalityColor(ns.criticality)}>
                        {ns.criticality}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {ns.infrastructure_owner_team ? (
                      <span>{ns.infrastructure_owner_team.name}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-500">
                        <AlertTriangle className="h-4 w-4" />
                        No owner
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {ns.document_count && ns.document_count > 0 ? (
                        <FileText className="h-4 w-4 text-green-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      {ns.dependency_count && ns.dependency_count > 0 ? (
                        <GitBranch className="h-4 w-4 text-green-500" />
                      ) : (
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {ns.updated_at ? formatRelativeTime(ns.updated_at) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {namespaces.length} of {total} namespaces
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
