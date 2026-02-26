import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  GitBranch,
  Plus,
  Search,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  Filter,
  Network,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dependenciesApi } from '@/api'
import { InternalDependency, ExternalDependency } from '@/types'
import { PageHeader, LoadingPage, EmptyState } from '@/components/ui/common'

const dependencyTypeColors: Record<string, string> = {
  api: 'bg-blue-500',
  database: 'bg-green-500',
  queue: 'bg-purple-500',
  cache: 'bg-orange-500',
  storage: 'bg-cyan-500',
  saas: 'bg-pink-500',
  'payment-gateway': 'bg-red-500',
}

export default function Dependencies() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [criticalOnly, setCriticalOnly] = useState(false)

  const { data: internalDeps, isLoading: loadingInternal } = useQuery({
    queryKey: ['internal-dependencies'],
    queryFn: () => dependenciesApi.listInternal({ page: 1, page_size: 100 }),
  })

  const { data: externalDeps, isLoading: loadingExternal } = useQuery({
    queryKey: ['external-dependencies'],
    queryFn: () => dependenciesApi.listExternal(''),
  })

  const isLoading = loadingInternal || loadingExternal

  if (isLoading) {
    return <LoadingPage message="Loading dependencies..." />
  }

  // Stats
  const totalInternal = internalDeps?.data?.length || 0
  const totalExternal = externalDeps?.length || 0
  const criticalInternal = internalDeps?.data?.filter((d) => d.is_critical).length || 0
  const criticalExternal = externalDeps?.filter((d) => d.is_critical).length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dependencies"
        description="Manage internal and external service dependencies"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Network className="mr-2 h-4 w-4" />
              View Graph
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Dependency
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Internal Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInternal}</div>
            <p className="text-xs text-muted-foreground">
              {criticalInternal} critical
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              External Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExternal}</div>
            <p className="text-xs text-muted-foreground">
              {criticalExternal} critical
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {criticalInternal + criticalExternal}
            </div>
            <p className="text-xs text-muted-foreground">
              Total critical dependencies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dependency Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set([
                ...(internalDeps?.data?.map((d) => d.dependency_type) || []),
                ...(externalDeps?.map((d) => d.system_type) || []),
              ]).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique types</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="internal" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="internal">
              Internal ({totalInternal})
            </TabsTrigger>
            <TabsTrigger value="external">
              External ({totalExternal})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dependencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="queue">Queue</SelectItem>
                <SelectItem value="cache">Cache</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={criticalOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCriticalOnly(!criticalOnly)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Critical Only
            </Button>
          </div>
        </div>

        {/* Internal Dependencies */}
        <TabsContent value="internal" className="space-y-4">
          {internalDeps?.data && internalDeps.data.length > 0 ? (
            <div className="space-y-3">
              {internalDeps.data
                .filter((dep) => !criticalOnly || dep.is_critical)
                .filter(
                  (dep) =>
                    typeFilter === 'all' || dep.dependency_type === typeFilter
                )
                .map((dep) => (
                  <InternalDependencyCard key={dep.id} dependency={dep} />
                ))}
            </div>
          ) : (
            <EmptyState
              icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
              title="No internal dependencies"
              description="Add dependencies between namespaces to track service relationships"
              action={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Internal Dependency
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* External Dependencies */}
        <TabsContent value="external" className="space-y-4">
          {externalDeps && externalDeps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {externalDeps
                .filter((dep) => !criticalOnly || dep.is_critical)
                .filter(
                  (dep) =>
                    typeFilter === 'all' || dep.system_type === typeFilter
                )
                .map((dep) => (
                  <ExternalDependencyCard key={dep.id} dependency={dep} />
                ))}
            </div>
          ) : (
            <EmptyState
              icon={<ExternalLink className="h-6 w-6 text-muted-foreground" />}
              title="No external dependencies"
              description="Add external systems like databases, APIs, and SaaS services"
              action={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add External Dependency
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InternalDependencyCard({ dependency }: { dependency: InternalDependency }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Source */}
          <div className="flex-1">
            <p className="font-medium">{dependency.source_namespace_name || 'Unknown'}</p>
            {dependency.source_resource_name && (
              <p className="text-sm text-muted-foreground">
                {dependency.source_resource_type}: {dependency.source_resource_name}
              </p>
            )}
          </div>

          {/* Arrow with type */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                dependencyTypeColors[dependency.dependency_type] || 'bg-gray-500'
              }`}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {dependency.dependency_type}
            </Badge>
          </div>

          {/* Target */}
          <div className="flex-1 text-right">
            <p className="font-medium">{dependency.target_namespace_name || 'Unknown'}</p>
            {dependency.target_resource_name && (
              <p className="text-sm text-muted-foreground">
                {dependency.target_resource_type}: {dependency.target_resource_name}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {dependency.is_critical && (
              <Badge variant="destructive" className="text-xs">
                Critical
              </Badge>
            )}
            <Badge
              variant={dependency.status === 'active' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {dependency.status}
            </Badge>
          </div>
        </div>
        {dependency.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {dependency.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ExternalDependencyCard({ dependency }: { dependency: ExternalDependency }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                dependencyTypeColors[dependency.system_type] || 'bg-gray-500'
              }`}
            >
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{dependency.name}</CardTitle>
              <CardDescription>
                {dependency.provider || dependency.system_type}
              </CardDescription>
            </div>
          </div>
          {dependency.is_critical && (
            <Badge variant="destructive">Critical</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {dependency.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {dependency.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {dependency.endpoint && (
            <span className="truncate max-w-[200px]">{dependency.endpoint}</span>
          )}
          {dependency.expected_availability && (
            <Badge variant="outline">{dependency.expected_availability}</Badge>
          )}
        </div>
        {dependency.contact_email && (
          <p className="mt-2 text-xs text-muted-foreground">
            Contact: {dependency.contact_email}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
