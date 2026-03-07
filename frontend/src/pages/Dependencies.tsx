import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useMemo } from 'react'
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
  Trash2,
  ArrowRight,
  Globe,
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
import { useTranslation } from '@/i18n'
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

const protocols = [
  { value: 'http', label: 'HTTP', port: 80 },
  { value: 'https', label: 'HTTPS', port: 443 },
  { value: 'grpc', label: 'gRPC', port: 9090 },
  { value: 'tcp', label: 'TCP', port: null },
  { value: 'udp', label: 'UDP', port: null },
  { value: 'websocket', label: 'WebSocket', port: 443 },
  { value: 'kafka', label: 'Kafka', port: 9092 },
  { value: 'rabbitmq', label: 'RabbitMQ', port: 5672 },
  { value: 'redis', label: 'Redis', port: 6379 },
  { value: 'postgresql', label: 'PostgreSQL', port: 5432 },
  { value: 'mysql', label: 'MySQL', port: 3306 },
  { value: 'mongodb', label: 'MongoDB', port: 27017 },
]

const networkAccessTypes = [
  { value: 'direct', label: 'Direct Pod-to-Pod' },
  { value: 'service', label: 'ClusterIP Service' },
  { value: 'ingress', label: 'Ingress' },
  { value: 'service_mesh', label: 'Service Mesh (Istio)' },
  { value: 'nodeport', label: 'NodePort' },
  { value: 'loadbalancer', label: 'LoadBalancer' },
]

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: 'namespace' | 'external'
  cluster?: string
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string
  type: string
  isCritical: boolean
  isExternal: boolean
  protocol?: string
  port?: number
  networkAccess?: string
}

export default function Dependencies() {
  const { t, language } = useTranslation()
  const queryClient = useQueryClient()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [dialogClusterFilter, setDialogClusterFilter] = useState<string>('all')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false)
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Form states
  const [internalForm, setInternalForm] = useState({
    source_namespace_id: '',
    target_namespace_id: '',
    dependency_type: 'api',
    description: '',
    is_critical: false,
    protocol: 'http',
    port: '',
    same_cluster: true,
    network_access: 'service',
  })

  const [externalForm, setExternalForm] = useState({
    namespace_id: '',
    name: '',
    system_type: 'saas',
    description: '',
    endpoint: '',
    is_critical: false,
    protocol: 'https',
    port: '',
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

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-deps'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const namespaces: Namespace[] = allNamespacesData?.items || []
  const clusters: Cluster[] = clustersData?.items || []
  
  // Filter namespaces for dialog based on dialogClusterFilter
  const formNamespaces: Namespace[] = useMemo(() => {
    const allNs = allNamespacesData?.items || []
    if (dialogClusterFilter === 'all') {
      return allNs
    }
    return allNs.filter(ns => ns.cluster_id === dialogClusterFilter)
  }, [allNamespacesData, dialogClusterFilter])

  // Mutations
  const createInternalMutation = useMutation({
    mutationFn: (data: any) => {
      // Include metadata for protocol, port, network access
      const payload = {
        ...data,
        metadata: {
          protocol: data.protocol,
          port: data.port ? parseInt(data.port) : null,
          same_cluster: data.same_cluster,
          network_access: data.network_access,
        }
      }
      return dependenciesApi.createInternal(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-dependencies'] })
      setIsAddInternalOpen(false)
      setInternalForm({
        source_namespace_id: '',
        target_namespace_id: '',
        dependency_type: 'api',
        description: '',
        is_critical: false,
        protocol: 'http',
        port: '',
        same_cluster: true,
        network_access: 'service',
      })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create internal dependency')
    },
  })

  const createExternalMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        metadata: {
          protocol: data.protocol,
          port: data.port ? parseInt(data.port) : null,
        }
      }
      return dependenciesApi.createExternal(payload)
    },
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
        protocol: 'https',
        port: '',
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

  // Build graph data
  const graphData = useMemo(() => {
    const internalList: InternalDependency[] = internalDeps?.items || []
    const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
    
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const nodeMap = new Map<string, GraphNode>()

    // Add namespace nodes from internal dependencies
    internalList.forEach(dep => {
      if (!nodeMap.has(dep.source_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.source_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }
      
      if (!nodeMap.has(dep.target_namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.target_namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }

      const metadata = (dep as any).metadata || {}
      links.push({
        source: dep.source_namespace_id,
        target: dep.target_namespace_id,
        type: dep.dependency_type,
        isCritical: dep.is_critical,
        isExternal: false,
        id: dep.id,
        protocol: metadata.protocol,
        port: metadata.port,
        networkAccess: metadata.network_access,
      })
    })

    // Add external dependencies
    externalList.forEach(dep => {
      if (!nodeMap.has(dep.namespace_id)) {
        const ns = namespaces.find(n => n.id === dep.namespace_id)
        if (ns) {
          const cluster = clusters.find(c => c.id === ns.cluster_id)
          const node: GraphNode = {
            id: ns.id,
            name: ns.name,
            type: 'namespace',
            cluster: cluster?.display_name || cluster?.name,
          }
          nodeMap.set(ns.id, node)
          nodes.push(node)
        }
      }

      const extId = `ext_${dep.id}`
      if (!nodeMap.has(extId)) {
        const node: GraphNode = {
          id: extId,
          name: dep.name,
          type: 'external',
        }
        nodeMap.set(extId, node)
        nodes.push(node)
      }

      const metadata = (dep as any).metadata || {}
      links.push({
        source: dep.namespace_id,
        target: extId,
        type: dep.system_type || 'external',
        isCritical: dep.is_critical,
        isExternal: true,
        id: dep.id,
        protocol: metadata.protocol,
        port: metadata.port,
      })
    })

    // Filter by cluster
    let filteredNodes = nodes
    if (clusterFilter !== 'all') {
      const clusterName = clusters.find(c => c.id === clusterFilter)?.name || 
                          clusters.find(c => c.id === clusterFilter)?.display_name
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
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)
    })

    return { nodes: filteredNodes, links: filteredLinks, nodeMap }
  }, [internalDeps, externalDeps, namespaces, clusters, clusterFilter, searchQuery])

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width || 800, height: 550 })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = dimensions.width
    const height = dimensions.height

    // Create zoom container
    const g = svg.append('g')

    // Arrow markers
    const defs = svg.append('defs')
    
    Object.entries(dependencyTypeColors).forEach(([type, colors]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', colors.stroke)
        .attr('d', 'M0,-5L10,0L0,5')
    })

    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#94a3b8')
      .attr('d', 'M0,-5L10,0L0,5')

    // Deep copy nodes and links for simulation
    const simNodes = graphData.nodes.map(d => ({ ...d }))
    const simLinks = graphData.links.map(d => ({ ...d }))

    // Create simulation
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(simLinks)
        .id(d => d.id)
        .distance(180)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('g')
      .data(simLinks)
      .enter()
      .append('g')

    // Link path
    const linkPath = link.append('path')
      .attr('fill', 'none')
      .attr('stroke', d => dependencyTypeColors[d.type]?.stroke || '#94a3b8')
      .attr('stroke-width', d => d.isCritical ? 3 : 2)
      .attr('stroke-dasharray', d => d.isExternal ? '8,4' : 'none')
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .attr('opacity', 0.7)

    // Link labels (protocol:port)
    const linkLabel = link.append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text(d => {
        const parts = []
        if (d.protocol) parts.push(d.protocol.toUpperCase())
        if (d.port) parts.push(`:${d.port}`)
        return parts.join('')
      })

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('cursor', 'grab')
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
        setSelectedNode(selectedNode === d.id ? null : d.id)
      })

    // Node circles with gradient
    node.append('circle')
      .attr('r', 24)
      .attr('fill', d => d.type === 'external' ? '#ec4899' : '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')

    // Node icons
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .text(d => d.type === 'external' ? '☁' : '⬡')

    // Node labels
    node.append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name)

    // Cluster labels
    node.filter(d => d.type === 'namespace' && !!d.cluster)
      .append('text')
      .attr('dy', 52)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .text(d => d.cluster || '')

    // Update positions
    simulation.on('tick', () => {
      linkPath.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
      })

      linkLabel.attr('transform', (d: any) => {
        const midX = (d.source.x + d.target.x) / 2
        const midY = (d.source.y + d.target.y) / 2
        return `translate(${midX}, ${midY})`
      })

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Initial zoom to fit
    const initialScale = Math.min(width / 900, height / 700, 1)
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2)
    )

    return () => {
      simulation.stop()
    }
  }, [graphData, dimensions, selectedNode])

  // Get selected node details
  const selectedNodeData = selectedNode ? graphData.nodeMap.get(selectedNode) : null
  const selectedNodeLinks = selectedNode ? {
    incoming: graphData.links.filter(l => {
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return targetId === selectedNode
    }),
    outgoing: graphData.links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      return sourceId === selectedNode
    }),
  } : null

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
            <h1 className="text-3xl font-bold">{t('dependencies.title')}</h1>
            <p className="text-muted-foreground">{t('dependencies.subtitle')}</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load dependencies</h3>
            <Button onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh')}
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
            {t('dependencies.title')}
          </h1>
          <p className="text-muted-foreground">{t('dependencies.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setIsAddInternalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dependencies.addInternal')}
          </Button>
          <Button onClick={() => setIsAddExternalOpen(true)} variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            {t('dependencies.addExternal')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            {t('common.close')}
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
                <p className="text-sm text-muted-foreground">{t('dependencies.internal')}</p>
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
                <p className="text-sm text-muted-foreground">{t('dependencies.external')}</p>
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
                <p className="text-sm text-muted-foreground">{t('dependencies.critical')}</p>
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
                <p className="text-sm text-muted-foreground">{t('dependencies.nodes')}</p>
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
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-48"
          />
        </div>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')} Clusters</SelectItem>
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
          <CardContent className="p-0" ref={containerRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-[550px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : graphData.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[550px] bg-muted/30">
                <Network className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('dependencies.noDeps')}</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {t('dependencies.createDeps')}
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setIsAddInternalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('dependencies.addInternal')}
                  </Button>
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width={dimensions.width}
                height={550}
                className="bg-gradient-to-br from-background to-muted/30"
              />
            )}
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedNodeData ? selectedNodeData.name : t('common.details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNodeData ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('common.type')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('dependencies.outgoing')} ({selectedNodeLinks?.outgoing.length || 0})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedNodeLinks?.outgoing.map((link) => {
                      const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id
                      const target = graphData.nodeMap.get(targetId)
                      const colors = dependencyTypeColors[link.type]
                      return (
                        <div key={link.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className={colors?.text}>{link.type}</Badge>
                          <span className="truncate flex-1">{target?.name}</span>
                          {link.protocol && (
                            <span className="text-xs text-muted-foreground">
                              {link.protocol.toUpperCase()}{link.port ? `:${link.port}` : ''}
                            </span>
                          )}
                          {link.isCritical && <Badge variant="destructive" className="text-xs">{t('dependencies.critical')}</Badge>}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
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
                      <p className="text-sm text-muted-foreground">{t('common.none')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('dependencies.incoming')} ({selectedNodeLinks?.incoming.length || 0})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedNodeLinks?.incoming.map((link) => {
                      const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id
                      const source = graphData.nodeMap.get(sourceId)
                      const colors = dependencyTypeColors[link.type]
                      return (
                        <div key={link.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <ArrowRight className="h-3 w-3 text-muted-foreground rotate-180" />
                          <Badge variant="outline" className={colors?.text}>{link.type}</Badge>
                          <span className="truncate flex-1">{source?.name}</span>
                          {link.protocol && (
                            <span className="text-xs text-muted-foreground">
                              {link.protocol.toUpperCase()}{link.port ? `:${link.port}` : ''}
                            </span>
                          )}
                          {link.isCritical && <Badge variant="destructive" className="text-xs">{t('dependencies.critical')}</Badge>}
                        </div>
                      )
                    })}
                    {selectedNodeLinks?.incoming.length === 0 && (
                      <p className="text-sm text-muted-foreground">{t('common.none')}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{t('dependencies.selectNode')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('dependencies.nodeTypes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-4">
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
              <span className="text-sm font-medium">{t('dependencies.linkTypes')}:</span>
              {Object.entries(dependencyTypeColors).slice(0, 5).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-6 h-0.5" style={{ backgroundColor: colors.stroke }} />
                  <span className="text-sm capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 {t('dependencies.tip')}
          </p>
        </CardContent>
      </Card>

      {/* Add Internal Dependency Dialog */}
      <Dialog open={isAddInternalOpen} onOpenChange={(open) => {
        setIsAddInternalOpen(open)
        if (!open) {
          setDialogClusterFilter('all')
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-500" />
              {t('dependencies.addInternal')}
            </DialogTitle>
            <DialogDescription>
              {language === 'tr' ? 'Namespace\'ler arasında internal bağımlılık tanımlayın' : 'Define internal dependency between namespaces'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cluster Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {language === 'tr' ? 'Cluster Filtresi' : 'Cluster Filter'}
              </Label>
              <Select
                value={dialogClusterFilter}
                onValueChange={(v) => {
                  setDialogClusterFilter(v)
                  // Reset namespace selections when cluster changes
                  setInternalForm({ ...internalForm, source_namespace_id: '', target_namespace_id: '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')} Clusters</SelectItem>
                  {clusters.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.display_name || cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {language === 'tr' 
                  ? `${formNamespaces.length} namespace listeleniyor` 
                  : `Showing ${formNamespaces.length} namespaces`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dependencies.sourceNamespace')} *</Label>
                <Select
                  value={internalForm.source_namespace_id}
                  onValueChange={(v) => setInternalForm({ ...internalForm, source_namespace_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
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
                <Label>{t('dependencies.targetNamespace')} *</Label>
                <Select
                  value={internalForm.target_namespace_id}
                  onValueChange={(v) => setInternalForm({ ...internalForm, target_namespace_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dependencies.dependencyType')}</Label>
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
                <Label>{t('dependencies.protocol')}</Label>
                <Select
                  value={internalForm.protocol}
                  onValueChange={(v) => {
                    const proto = protocols.find(p => p.value === v)
                    setInternalForm({ 
                      ...internalForm, 
                      protocol: v,
                      port: proto?.port?.toString() || internalForm.port
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} {p.port ? `(${p.port})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dependencies.port')} ({t('common.optional')})</Label>
                <Input
                  type="number"
                  placeholder="8080"
                  value={internalForm.port}
                  onChange={(e) => setInternalForm({ ...internalForm, port: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dependencies.networkAccess')}</Label>
                <Select
                  value={internalForm.network_access}
                  onValueChange={(v) => setInternalForm({ ...internalForm, network_access: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {networkAccessTypes.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea
                placeholder={language === 'tr' ? 'Bağımlılık hakkında not...' : 'Notes about this dependency...'}
                value={internalForm.description}
                onChange={(e) => setInternalForm({ ...internalForm, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="same-cluster"
                  checked={internalForm.same_cluster}
                  onCheckedChange={(checked) => setInternalForm({ ...internalForm, same_cluster: !!checked })}
                />
                <Label htmlFor="same-cluster" className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('dependencies.sameCluster')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal-critical"
                  checked={internalForm.is_critical}
                  onCheckedChange={(checked) => setInternalForm({ ...internalForm, is_critical: !!checked })}
                />
                <Label htmlFor="internal-critical" className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  {t('dependencies.markCritical')}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInternalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createInternalMutation.mutate(internalForm)}
              disabled={!internalForm.source_namespace_id || !internalForm.target_namespace_id || createInternalMutation.isPending}
            >
              {createInternalMutation.isPending ? t('common.loading') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Dependency Dialog */}
      <Dialog open={isAddExternalOpen} onOpenChange={(open) => {
        setIsAddExternalOpen(open)
        if (!open) {
          setDialogClusterFilter('all')
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-purple-500" />
              {t('dependencies.addExternal')}
            </DialogTitle>
            <DialogDescription>
              {language === 'tr' ? 'Dış sistemlere olan bağımlılıkları tanımlayın' : 'Define dependencies to external systems'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cluster Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {language === 'tr' ? 'Cluster Filtresi' : 'Cluster Filter'}
              </Label>
              <Select
                value={dialogClusterFilter}
                onValueChange={(v) => {
                  setDialogClusterFilter(v)
                  setExternalForm({ ...externalForm, namespace_id: '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')} Clusters</SelectItem>
                  {clusters.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.display_name || cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {language === 'tr' 
                  ? `${formNamespaces.length} namespace listeleniyor` 
                  : `Showing ${formNamespaces.length} namespaces`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{language === 'tr' ? 'Namespace' : 'Namespace'} *</Label>
              <Select
                value={externalForm.namespace_id}
                onValueChange={(v) => setExternalForm({ ...externalForm, namespace_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
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
                <Label>{t('dependencies.serviceName')} *</Label>
                <Input
                  placeholder="örn: Stripe, AWS S3"
                  value={externalForm.name}
                  onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dependencies.systemType')}</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dependencies.protocol')}</Label>
                <Select
                  value={externalForm.protocol}
                  onValueChange={(v) => {
                    const proto = protocols.find(p => p.value === v)
                    setExternalForm({ 
                      ...externalForm, 
                      protocol: v,
                      port: proto?.port?.toString() || externalForm.port
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('dependencies.port')} ({t('common.optional')})</Label>
                <Input
                  type="number"
                  placeholder="443"
                  value={externalForm.port}
                  onChange={(e) => setExternalForm({ ...externalForm, port: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('dependencies.endpoint')}</Label>
              <Input
                placeholder="https://api.example.com"
                value={externalForm.endpoint}
                onChange={(e) => setExternalForm({ ...externalForm, endpoint: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea
                placeholder={language === 'tr' ? 'Bu bağımlılık hakkında not...' : 'Notes about this dependency...'}
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
                {t('dependencies.markCritical')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExternalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createExternalMutation.mutate(externalForm)}
              disabled={!externalForm.namespace_id || !externalForm.name || createExternalMutation.isPending}
            >
              {createExternalMutation.isPending ? t('common.loading') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
