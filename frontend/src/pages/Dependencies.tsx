import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
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
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const dependencyTypeColors: Record<string, string> = {
  api: '#3b82f6',
  database: '#22c55e',
  queue: '#a855f7',
  cache: '#f97316',
  storage: '#06b6d4',
  saas: '#ec4899',
  'payment-gateway': '#ef4444',
}

interface GraphNode {
  id: string
  name: string
  type: 'namespace' | 'external'
  cluster?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  isCritical: boolean
  id: string
}

export default function Dependencies() {
  const queryClient = useQueryClient()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [searchQuery, setSearchQuery] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false)
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })

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

  const isLoading = loadingInternal || loadingExternal

  // Build graph data
  const graphData = useMemo(() => {
    const internalList: InternalDependency[] = internalDeps?.items || []
    const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
    
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const nodeMap = new Map<string, GraphNode>()

    // Add namespace nodes from internal dependencies
    internalList.forEach(dep => {
      // Source namespace
      if (!nodeMap.has(dep.source_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.source_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.name || cluster?.display_name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }
      
      // Target namespace
      if (!nodeMap.has(dep.target_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.target_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.name || cluster?.display_name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }

      // Add link
      links.push({
        source: dep.source_namespace_id,
        target: dep.target_namespace_id,
        type: dep.dependency_type,
        isCritical: dep.is_critical,
        id: dep.id,
      })
    })

    // Add external dependencies
    externalList.forEach(dep => {
      // Source namespace
      if (!nodeMap.has(dep.namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.name || cluster?.display_name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }

      // External service node
      const externalId = `ext_${dep.id}`
      if (!nodeMap.has(externalId)) {
        const node: GraphNode = {
          id: externalId,
          name: dep.name,
          type: 'external',
        }
        nodeMap.set(externalId, node)
        nodes.push(node)
      }

      // Add link
      links.push({
        source: dep.namespace_id,
        target: externalId,
        type: dep.system_type || 'external',
        isCritical: dep.is_critical,
        id: dep.id,
      })
    })

    // Filter by cluster
    let filteredNodes = nodes
    if (clusterFilter !== 'all') {
      const clusterName = clusters.find(c => c.id === clusterFilter)?.name
      filteredNodes = nodes.filter(n => n.type === 'external' || n.cluster === clusterName)
    }

    // Filter by search
    if (searchQuery) {
      filteredNodes = filteredNodes.filter(n => 
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredLinks = links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id
      const targetId = typeof l.target === 'string' ? l.target : l.target.id
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)
    })

    return { nodes: filteredNodes, links: filteredLinks }
  }, [internalDeps, externalDeps, namespaces, clusters, clusterFilter, searchQuery])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: Math.max(600, rect.height) })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // D3 Force simulation
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = dimensions.width
    const height = dimensions.height

    // Create container group for zoom
    const g = svg.append('g')

    // Define arrow markers
    const defs = svg.append('defs')
    
    Object.entries(dependencyTypeColors).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', color)
        .attr('d', 'M0,-5L10,0L0,5')
    })

    // Default arrow
    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#94a3b8')
      .attr('d', 'M0,-5L10,0L0,5')

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(graphData.links)
        .id((d: any) => d.id)
        .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(graphData.links)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d: GraphLink) => dependencyTypeColors[d.type] || '#94a3b8')
      .attr('stroke-width', (d: GraphLink) => d.isCritical ? 3 : 2)
      .attr('stroke-dasharray', (d: GraphLink) => {
        const target = typeof d.target === 'string' ? d.target : d.target.id
        return target.startsWith('ext_') ? '5,5' : 'none'
      })
      .attr('marker-end', (d: GraphLink) => `url(#arrow-${d.type})`)
      .attr('opacity', 0.7)

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )
      .on('click', (_event, d) => {
        setSelectedNode(d)
      })

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: GraphNode) => d.type === 'external' ? '#ec4899' : '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))')

    // Node icons
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .text((d: GraphNode) => d.type === 'external' ? '☁' : '⬡')

    // Node labels
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text((d: GraphNode) => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name)

    // Cluster labels
    node.filter((d: GraphNode) => d.type === 'namespace' && !!d.cluster)
      .append('text')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text((d: GraphNode) => d.cluster || '')

    // Update positions on tick
    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx * dx + dy * dy) * 2
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
      })

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k })
      })

    svg.call(zoom)

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, dimensions])

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4])
    
    if (direction === 'reset') {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
    } else {
      const scale = direction === 'in' ? 1.3 : 0.7
      svg.transition().duration(300).call(zoom.scaleBy, scale)
    }
  }, [])

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
            Dependency Topology
          </h1>
          <p className="text-muted-foreground">Servis bağımlılıklarını görsel harita üzerinde görüntüleyin</p>
        </div>
        <div className="flex gap-2">
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
                <p className="text-3xl font-bold text-green-500">{graphData.nodes.length}</p>
                <p className="text-sm text-muted-foreground">Node</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom('out')}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom('in')}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom('reset')}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {Math.round(transform.k * 100)}%
          </span>
        </div>
      </div>

      {/* Topology View */}
      <Card className="overflow-hidden">
        <CardContent className="p-0" ref={containerRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[600px] bg-muted/30">
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
                  Internal Bağımlılık Ekle
                </Button>
                <Button onClick={() => setIsAddExternalOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  External Bağımlılık Ekle
                </Button>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="bg-gradient-to-br from-background to-muted/30"
              style={{ cursor: 'grab' }}
            />
          )}
        </CardContent>
      </Card>

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
              {Object.entries(dependencyTypeColors).slice(0, 5).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
                  <span className="text-sm capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Node'ları sürükleyerek taşıyabilir, fare tekerleği ile zoom yapabilirsiniz.
          </p>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedNode.type === 'external' ? (
                  <Cloud className="h-5 w-5 text-pink-500" />
                ) : (
                  <Server className="h-5 w-5 text-blue-500" />
                )}
                {selectedNode.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Tür</p>
                <p className="font-medium capitalize">{selectedNode.type}</p>
              </div>
              {selectedNode.cluster && (
                <div>
                  <p className="text-sm text-muted-foreground">Cluster</p>
                  <p className="font-medium">{selectedNode.cluster}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Gelen Bağlantılar</p>
                <p className="font-medium">
                  {graphData.links.filter(l => {
                    const targetId = typeof l.target === 'string' ? l.target : l.target.id
                    return targetId === selectedNode.id
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giden Bağlantılar</p>
                <p className="font-medium">
                  {graphData.links.filter(l => {
                    const sourceId = typeof l.source === 'string' ? l.source : l.source.id
                    return sourceId === selectedNode.id
                  }).length}
                </p>
              </div>
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
