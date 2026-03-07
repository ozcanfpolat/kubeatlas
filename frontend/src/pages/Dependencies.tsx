import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  GitBranch,
  Plus,
  Search,
  ExternalLink,
  AlertTriangle,
  Network,
  RefreshCw,
  Server,
  Cloud,
  Filter,
  Trash2,
  ArrowRight,
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

const dependencyTypeColors: Record<string, { bg: string; text: string; stroke: string }> = {
  api: { bg: 'bg-blue-500/10', text: 'text-blue-500', stroke: '#3b82f6' },
  database: { bg: 'bg-green-500/10', text: 'text-green-500', stroke: '#22c55e' },
  queue: { bg: 'bg-purple-500/10', text: 'text-purple-500', stroke: '#a855f7' },
  cache: { bg: 'bg-orange-500/10', text: 'text-orange-500', stroke: '#f97316' },
  storage: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', stroke: '#06b6d4' },
  saas: { bg: 'bg-pink-500/10', text: 'text-pink-500', stroke: '#ec4899' },
  'payment-gateway': { bg: 'bg-red-500/10', text: 'text-red-500', stroke: '#ef4444' },
}

interface NodePosition {
  id: string
  x: number
  y: number
  name: string
  type: 'namespace' | 'external'
  cluster?: string
}

export default function Dependencies() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false)
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [internalForm, setInternalForm] = useState({
    source_namespace_id: '',
    target_namespace_id: '',
    dependency_type: 'api',
    description: '',
    is_critical: false,
  })

  const [externalForm, setExternalForm] = useState({
    namespace_id: '',
    name: '',
    system_type: 'saas',
    description: '',
    endpoint: '',
    is_critical: false,
  })

  // Queries
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

  const { data: allNamespacesData } = useQuery({
    queryKey: ['all-namespaces-deps'],
    queryFn: () => namespacesApi.list({ page: 1, page_size: 500 }),
  })

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

  // Mutations
  const createInternalMutation = useMutation({
    mutationFn: (data: typeof internalForm) => dependenciesApi.createInternal(data),
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
    mutationFn: (data: typeof externalForm) => dependenciesApi.createExternal(data),
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

  // Build topology data
  const topologyData = useMemo(() => {
    const internalList: InternalDependency[] = internalDeps?.items || []
    const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
    
    const nodeMap = new Map<string, NodePosition>()
    const links: { source: string; target: string; type: string; isCritical: boolean; id: string; isExternal: boolean }[] = []

    // Collect all unique namespaces from dependencies
    internalList.forEach(dep => {
      if (!nodeMap.has(dep.source_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.source_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          nodeMap.set(ns.id, {
            id: ns.id,
            x: 0,
            y: 0,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          })
        }
      }
      if (!nodeMap.has(dep.target_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.target_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          nodeMap.set(ns.id, {
            id: ns.id,
            x: 0,
            y: 0,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          })
        }
      }
      links.push({
        source: dep.source_namespace_id,
        target: dep.target_namespace_id,
        type: dep.dependency_type,
        isCritical: dep.is_critical,
        id: dep.id,
        isExternal: false,
      })
    })

    externalList.forEach(dep => {
      if (!nodeMap.has(dep.namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          nodeMap.set(ns.id, {
            id: ns.id,
            x: 0,
            y: 0,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          })
        }
      }
      const extId = `ext_${dep.id}`
      if (!nodeMap.has(extId)) {
        nodeMap.set(extId, {
          id: extId,
          x: 0,
          y: 0,
          name: dep.name,
          type: 'external',
        })
      }
      links.push({
        source: dep.namespace_id,
        target: extId,
        type: dep.system_type || 'external',
        isCritical: dep.is_critical,
        id: dep.id,
        isExternal: true,
      })
    })

    // Calculate positions in a circular layout
    const nodes = Array.from(nodeMap.values())
    const centerX = 400
    const centerY = 300
    const radius = Math.min(250, nodes.length * 30)

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
      node.x = centerX + radius * Math.cos(angle)
      node.y = centerY + radius * Math.sin(angle)
    })

    return { nodes, links, nodeMap }
  }, [internalDeps, externalDeps, namespaces, clusters])

  // Filter nodes
  const filteredNodes = useMemo(() => {
    let nodes = topologyData.nodes

    if (clusterFilter !== 'all') {
      const clusterName = clusters.find(c => c.id === clusterFilter)?.name || 
                          clusters.find(c => c.id === clusterFilter)?.display_name
      nodes = nodes.filter(n => n.type === 'external' || n.cluster === clusterName)
    }

    if (searchQuery) {
      nodes = nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    return nodes
  }, [topologyData.nodes, clusterFilter, searchQuery, clusters])

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredLinks = topologyData.links.filter(l => 
    filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target)
  )

  // Stats
  const internalList: InternalDependency[] = internalDeps?.items || []
  const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
  const totalInternal = internalList.length
  const totalExternal = externalList.length
  const criticalCount = [...internalList, ...externalList].filter(d => d.is_critical).length

  // Get node details for selected
  const selectedNodeData = selectedNode ? topologyData.nodeMap.get(selectedNode) : null
  const selectedNodeLinks = selectedNode ? {
    incoming: filteredLinks.filter(l => l.target === selectedNode),
    outgoing: filteredLinks.filter(l => l.source === selectedNode),
  } : null

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
            Dependency Topology
          </h1>
          <p className="text-muted-foreground">Servis bağımlılıklarını görsel harita üzerinde görüntüleyin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
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
                <p className="text-3xl font-bold text-green-500">{filteredNodes.length}</p>
                <p className="text-sm text-muted-foreground">Node</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Namespace ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-48"
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

      {/* Topology View */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              Topology Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] bg-muted/30">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Network className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Henüz bağımlılık yok</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Namespace'leriniz arasında bağımlılık tanımlayarak topology haritasını oluşturun.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setIsAddInternalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Internal Ekle
                  </Button>
                  <Button onClick={() => setIsAddExternalOpen(true)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    External Ekle
                  </Button>
                </div>
              </div>
            ) : (
              <svg
                viewBox="0 0 800 600"
                className="w-full h-[500px] bg-gradient-to-br from-background to-muted/30"
              >
                {/* Arrow markers */}
                <defs>
                  {Object.entries(dependencyTypeColors).map(([type, colors]) => (
                    <marker
                      key={type}
                      id={`arrow-${type}`}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.stroke} />
                    </marker>
                  ))}
                  <marker
                    id="arrow-default"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* Links */}
                {filteredLinks.map((link) => {
                  const source = topologyData.nodeMap.get(link.source)
                  const target = topologyData.nodeMap.get(link.target)
                  if (!source || !target) return null

                  const colors = dependencyTypeColors[link.type] || { stroke: '#94a3b8' }
                  
                  // Calculate curved path
                  const dx = target.x - source.x
                  const dy = target.y - source.y
                  const dr = Math.sqrt(dx * dx + dy * dy) * 0.8

                  return (
                    <g key={link.id}>
                      <path
                        d={`M ${source.x} ${source.y} A ${dr} ${dr} 0 0 1 ${target.x} ${target.y}`}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={link.isCritical ? 3 : 2}
                        strokeDasharray={link.isExternal ? '5,5' : 'none'}
                        markerEnd={`url(#arrow-${link.type})`}
                        opacity={selectedNode ? (link.source === selectedNode || link.target === selectedNode ? 1 : 0.2) : 0.7}
                        className="transition-opacity duration-200"
                      />
                    </g>
                  )
                })}

                {/* Nodes */}
                {filteredNodes.map((node) => (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    className="cursor-pointer"
                    opacity={selectedNode ? (selectedNode === node.id || 
                      filteredLinks.some(l => l.source === selectedNode && l.target === node.id) ||
                      filteredLinks.some(l => l.target === selectedNode && l.source === node.id) ? 1 : 0.3) : 1}
                  >
                    {/* Node circle */}
                    <circle
                      r={selectedNode === node.id ? 28 : 24}
                      fill={node.type === 'external' ? '#ec4899' : '#3b82f6'}
                      stroke={selectedNode === node.id ? '#fff' : 'transparent'}
                      strokeWidth={3}
                      className="transition-all duration-200"
                    />
                    {/* Node icon */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="16"
                    >
                      {node.type === 'external' ? '☁' : '⬡'}
                    </text>
                    {/* Node label */}
                    <text
                      y={38}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="11"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {node.name.length > 18 ? node.name.slice(0, 16) + '...' : node.name}
                    </text>
                    {/* Cluster label */}
                    {node.cluster && (
                      <text
                        y={50}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        className="pointer-events-none"
                      >
                        {node.cluster}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedNodeData ? selectedNodeData.name : 'Detaylar'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNodeData ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tür</p>
                  <div className="flex items-center gap-2">
                    {selectedNodeData.type === 'external' ? (
                      <Cloud className="h-5 w-5 text-pink-500" />
                    ) : (
                      <Server className="h-5 w-5 text-blue-500" />
                    )}
                    <span className="font-medium capitalize">{selectedNodeData.type}</span>
                  </div>
                </div>

                {selectedNodeData.cluster && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Cluster</p>
                    <p className="font-medium">{selectedNodeData.cluster}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Giden Bağlantılar ({selectedNodeLinks?.outgoing.length || 0})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedNodeLinks?.outgoing.map((link) => {
                      const target = topologyData.nodeMap.get(link.target)
                      const colors = dependencyTypeColors[link.type]
                      return (
                        <div key={link.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className={colors?.text}>{link.type}</Badge>
                          <span className="truncate">{target?.name}</span>
                          {link.isCritical && <Badge variant="destructive" className="text-xs">Kritik</Badge>}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (link.isExternal) {
                                deleteExternalMutation.mutate(link.id)
                              } else {
                                deleteInternalMutation.mutate(link.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                    {selectedNodeLinks?.outgoing.length === 0 && (
                      <p className="text-sm text-muted-foreground">Yok</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Gelen Bağlantılar ({selectedNodeLinks?.incoming.length || 0})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedNodeLinks?.incoming.map((link) => {
                      const source = topologyData.nodeMap.get(link.source)
                      const colors = dependencyTypeColors[link.type]
                      return (
                        <div key={link.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <ArrowRight className="h-3 w-3 text-muted-foreground rotate-180" />
                          <Badge variant="outline" className={colors?.text}>{link.type}</Badge>
                          <span className="truncate">{source?.name}</span>
                          {link.isCritical && <Badge variant="destructive" className="text-xs">Kritik</Badge>}
                        </div>
                      )
                    })}
                    {selectedNodeLinks?.incoming.length === 0 && (
                      <p className="text-sm text-muted-foreground">Yok</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Detay görüntülemek için bir node seçin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gösterim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Node Türleri:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="text-sm">Namespace</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500" />
                <span className="text-sm">External</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Bağlantı Türleri:</span>
              {Object.entries(dependencyTypeColors).slice(0, 5).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-6 h-0.5" style={{ backgroundColor: colors.stroke }} />
                  <span className="text-sm capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Node'lara tıklayarak detayları görebilir ve bağımlılıkları silebilirsiniz.
          </p>
        </CardContent>
      </Card>

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
