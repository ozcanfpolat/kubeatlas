import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { DependencyGraph as DependencyGraphType, DependencyNode, DependencyEdge } from '@/types'

interface DependencyGraphProps {
  graph: DependencyGraphType
  selectedNodeId?: string
  onNodeClick?: (node: DependencyNode) => void
  className?: string
}

// D3-like force simulation (simplified)
interface SimNode extends DependencyNode {
  x: number
  y: number
  vx: number
  vy: number
}

export function DependencyGraph({
  graph,
  selectedNodeId,
  onNodeClick,
  className,
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Initialize nodes with positions
  useEffect(() => {
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    const radius = Math.min(dimensions.width, dimensions.height) / 3

    const simNodes: SimNode[] = graph.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / graph.nodes.length
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      }
    })

    setNodes(simNodes)
  }, [graph.nodes, dimensions])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const { width, height } = svgRef.current.parentElement.getBoundingClientRect()
        setDimensions({ width: width || 800, height: height || 600 })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const getNodeColor = (node: DependencyNode) => {
    if (node.type === 'external') return '#f59e0b' // amber
    if (node.criticality === 'tier-1') return '#ef4444' // red
    if (node.criticality === 'tier-2') return '#f97316' // orange
    return '#3b82f6' // blue
  }

  const getEdgeColor = (edge: DependencyEdge) => {
    if (edge.is_critical) return '#ef4444'
    return '#64748b'
  }

  const getNodeById = useCallback(
    (id: string) => nodes.find((n) => n.id === id),
    [nodes]
  )

  return (
    <div className={cn('relative rounded-lg border bg-card', className)}>
      {/* Legend */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg bg-background/80 p-3 backdrop-blur-sm">
        <div className="text-xs font-medium text-muted-foreground">Legend</div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-xs">Namespace</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs">External System</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs">Tier-1 Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-red-500" />
          <span className="text-xs">Critical Dependency</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      >
        {/* Definitions */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <marker
            id="arrowhead-critical"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {/* Edges */}
        <g>
          {graph.edges.map((edge, index) => {
            const source = getNodeById(edge.source)
            const target = getNodeById(edge.target)
            if (!source || !target) return null

            const dx = target.x - source.x
            const dy = target.y - source.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const offsetX = (dx / length) * 30
            const offsetY = (dy / length) * 30

            return (
              <g key={index}>
                <line
                  x1={source.x + offsetX}
                  y1={source.y + offsetY}
                  x2={target.x - offsetX}
                  y2={target.y - offsetY}
                  stroke={getEdgeColor(edge)}
                  strokeWidth={edge.is_critical ? 2 : 1}
                  strokeDasharray={edge.is_critical ? undefined : '4 2'}
                  markerEnd={
                    edge.is_critical
                      ? 'url(#arrowhead-critical)'
                      : 'url(#arrowhead)'
                  }
                  className="transition-all duration-200"
                  style={{
                    opacity:
                      hoveredNode &&
                      hoveredNode !== edge.source &&
                      hoveredNode !== edge.target
                        ? 0.2
                        : 1,
                  }}
                />
                {/* Edge label */}
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                  style={{
                    opacity:
                      hoveredNode &&
                      hoveredNode !== edge.source &&
                      hoveredNode !== edge.target
                        ? 0
                        : 0.7,
                  }}
                >
                  {edge.dependency_type}
                </text>
              </g>
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id
            const isHovered = hoveredNode === node.id
            const isConnected =
              hoveredNode &&
              graph.edges.some(
                (e) =>
                  (e.source === hoveredNode && e.target === node.id) ||
                  (e.target === hoveredNode && e.source === node.id)
              )
            const dimmed = hoveredNode && !isHovered && !isConnected

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => onNodeClick?.(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  opacity: dimmed ? 0.3 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Node circle */}
                <circle
                  r={isSelected || isHovered ? 28 : 24}
                  fill={getNodeColor(node)}
                  stroke={isSelected ? '#ffffff' : 'transparent'}
                  strokeWidth={2}
                  className="transition-all duration-200"
                />
                {/* Node icon */}
                {node.type === 'external' ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white text-sm font-bold"
                  >
                    ⬡
                  </text>
                ) : (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white text-sm font-bold"
                  >
                    ⬢
                  </text>
                )}
                {/* Node label */}
                <text
                  y={36}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-medium"
                >
                  {node.name.length > 15
                    ? node.name.substring(0, 12) + '...'
                    : node.name}
                </text>
                {/* Environment badge */}
                {node.environment && (
                  <text
                    y={48}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {node.environment}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Empty state */}
      {graph.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No dependencies found</p>
            <p className="text-sm">Add dependencies to see the graph</p>
          </div>
        </div>
      )}
    </div>
  )
}
