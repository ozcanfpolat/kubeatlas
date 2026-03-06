import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import type { InternalDependency, ExternalDependency, Cluster } from '@/types'

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
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [criticalOnly, _setCriticalOnly] = useState(false)
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
    queryFn: () => dependenciesApi.listInternal({ page: 1, page_size: 100 }),
  })

  const { data: externalDeps, isLoading: loadingExternal } = useQuery({
    queryKey: ['external-dependencies'],
    queryFn: () => dependenciesApi.listExternal(''),
  })

  // All namespaces for displaying dependency info
  const { data: allNamespacesData } = useQuery({
    queryKey: ['all-namespaces-for-deps'],
    queryFn: () => namespacesApi.list({ page: 1, page_size: 500 }),
  })

  // Filtered namespaces for the add form
  const { data: filteredNamespacesData } = useQuery({
    queryKey: ['filtered-namespaces-for-deps', clusterFilter],
    queryFn: () => namespacesApi.list({ 
      page: 1, 
      page_size: 100,
      cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
    }),
  })

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-for-deps'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const deleteInternalMutation = useMutation({
    mutationFn: (id: string) => dependenciesApi.deleteInternal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-dependencies'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to delete dependency')
    },
  })

  const deleteExternalMutation = useMutation({
    mutationFn: (id: string) => dependenciesApi.deleteExternal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-dependencies'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to delete dependency')
    },
  })

  const createInternalMutation = useMutation({
    mutationFn: (data: typeof internalForm) => dependenciesApi.createInternal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-dependencies'] })
      setIsAddInternalOpen(false)
      resetInternalForm()
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
      resetExternalForm()
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create external dependency')
    },
  })

  const resetInternalForm = () => {
    setInternalForm({
      source_namespace_id: '',
      target_namespace_id: '',
      dependency_type: 'api',
      description: '',
      is_critical: false,
    })
  }

  const resetExternalForm = () => {
    setExternalForm({
      namespace_id: '',
      name: '',
      system_type: 'saas',
      description: '',
      endpoint: '',
      is_critical: false,
    })
  }

  const handleCreateInternal = () => {
    if (!internalForm.source_namespace_id || !internalForm.target_namespace_id) {
      setError('Please select both source and target namespaces')
      return
    }
    createInternalMutation.mutate(internalForm)
  }

  const handleCreateExternal = () => {
    if (!externalForm.namespace_id || !externalForm.name) {
      setError('Please fill in required fields')
      return
    }
    createExternalMutation.mutate(externalForm)
  }

  const isLoading = loadingInternal || loadingExternal
  const namespaces = allNamespacesData?.items || []  // All namespaces for display
  const formNamespaces = filteredNamespacesData?.items || []  // Filtered for form
  const clusters: Cluster[] = clustersData?.items || []

  // Error state
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

  // Stats
  const internalList: InternalDependency[] = internalDeps?.items || []
  const externalList: ExternalDependency[] = Array.isArray(externalDeps) ? externalDeps : []
  const totalInternal = internalList.length
  const totalExternal = externalList.length
  const criticalInternal = internalList.filter((d) => d.is_critical).length
  const criticalExternal = externalList.filter((d) => d.is_critical).length

  // Helper to get namespace name
  const getNamespaceName = (nsId: string) => {
    const ns = namespaces.find(n => n.id === nsId)
    return ns?.name || nsId.slice(0, 8) + '...'
  }

  // Helper to get cluster name for a namespace
  const getClusterForNamespace = (nsId: string) => {
    const ns = namespaces.find(n => n.id === nsId)
    if (!ns) return null
    return clusters.find(c => c.id === ns.cluster_id)
  }

  // Filter
  const filteredInternal = internalList.filter((dep) => {
    if (criticalOnly && !dep.is_critical) return false
    if (typeFilter !== 'all' && dep.dependency_type !== typeFilter) return false
    if (searchQuery && !dep.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredExternal = externalList.filter((dep) => {
    if (criticalOnly && !dep.is_critical) return false
    if (typeFilter !== 'all' && dep.system_type !== typeFilter) return false
    if (searchQuery && !dep.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dependencies</h1>
          <p className="text-muted-foreground">Manage internal and external service dependencies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Network className="mr-2 h-4 w-4" />
            View Graph
          </Button>
          <Button onClick={() => setIsAddInternalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Internal
          </Button>
          <Button onClick={() => setIsAddExternalOpen(true)} variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Add External
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Cluster Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Cluster:</Label>
          <Select value={clusterFilter} onValueChange={setClusterFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Clusters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clusters</SelectItem>
              {clusters.map((cluster) => (
                <SelectItem key={cluster.id} value={cluster.id}>
                  {cluster.display_name || cluster.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {clusterFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setClusterFilter('all')}>
            Clear Filter
          </Button>
        )}
      </div>

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
            <p className="text-xs text-muted-foreground">{criticalInternal} critical</p>
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
            <p className="text-xs text-muted-foreground">{criticalExternal} critical</p>
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
            <p className="text-xs text-muted-foreground">Total critical dependencies</p>
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
                ...internalList.map((d) => d.dependency_type),
                ...externalList.map((d) => d.system_type),
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
              <GitBranch className="mr-2 h-4 w-4" />
              Internal ({totalInternal})
            </TabsTrigger>
            <TabsTrigger value="external">
              <ExternalLink className="mr-2 h-4 w-4" />
              External ({totalExternal})
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="queue">Queue</SelectItem>
                <SelectItem value="cache">Cache</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="internal" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInternal.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No internal dependencies</h3>
                <p className="text-muted-foreground mb-4">
                  Add dependencies between your namespaces
                </p>
                <Button onClick={() => setIsAddInternalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Internal Dependency
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredInternal.map((dep) => {
                const sourceCluster = getClusterForNamespace(dep.source_namespace_id)
                const targetCluster = getClusterForNamespace(dep.target_namespace_id)
                return (
                  <Card key={dep.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Badge className={`${dependencyTypeColors[dep.dependency_type] || 'bg-gray-500'} text-white`}>
                            {dep.dependency_type.toUpperCase()}
                          </Badge>
                          
                          {/* Source Namespace */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="bg-muted rounded-lg px-3 py-2 min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{getNamespaceName(dep.source_namespace_id)}</p>
                                  {sourceCluster && (
                                    <p className="text-xs text-muted-foreground">{sourceCluster.name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
                            
                            {/* Target Namespace */}
                            <div className="bg-muted rounded-lg px-3 py-2 min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{getNamespaceName(dep.target_namespace_id)}</p>
                                  {targetCluster && (
                                    <p className="text-xs text-muted-foreground">{targetCluster.name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                          {dep.is_critical && (
                            <Badge variant="destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteInternalMutation.mutate(dep.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {dep.description && (
                        <p className="text-sm text-muted-foreground mt-2 ml-[100px]">{dep.description}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredExternal.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No external dependencies</h3>
                <p className="text-muted-foreground mb-4">
                  Add external services your application depends on
                </p>
                <Button onClick={() => setIsAddExternalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add External Dependency
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredExternal.map((dep) => {
                const nsCluster = getClusterForNamespace(dep.namespace_id)
                return (
                  <Card key={dep.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Badge className={`${dependencyTypeColors[dep.system_type] || 'bg-gray-500'} text-white`}>
                            {dep.system_type.toUpperCase()}
                          </Badge>
                          
                          {/* Namespace */}
                          <div className="bg-muted rounded-lg px-3 py-2 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{getNamespaceName(dep.namespace_id)}</p>
                                {nsCluster && (
                                  <p className="text-xs text-muted-foreground">{nsCluster.name}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
                          
                          {/* External System */}
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium text-sm">{dep.name}</p>
                                {dep.endpoint && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{dep.endpoint}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                          {dep.is_critical && (
                            <Badge variant="destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteExternalMutation.mutate(dep.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {dep.description && (
                        <p className="text-sm text-muted-foreground mt-2 ml-[100px]">{dep.description}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Internal Dependency Dialog */}
      <Dialog open={isAddInternalOpen} onOpenChange={setIsAddInternalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Dependency</DialogTitle>
            <DialogDescription>
              Create a dependency between two namespaces
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Namespace *</Label>
              <Select
                value={internalForm.source_namespace_id}
                onValueChange={(val) => setInternalForm({ ...internalForm, source_namespace_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source namespace" />
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
              <Label>Target Namespace *</Label>
              <Select
                value={internalForm.target_namespace_id}
                onValueChange={(val) => setInternalForm({ ...internalForm, target_namespace_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target namespace" />
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
              <Label>Dependency Type</Label>
              <Select
                value={internalForm.dependency_type}
                onValueChange={(val) => setInternalForm({ ...internalForm, dependency_type: val })}
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
              <Label>Description</Label>
              <Textarea
                value={internalForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInternalForm({ ...internalForm, description: e.target.value })}
                placeholder="Describe this dependency..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal-critical"
                checked={internalForm.is_critical}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setInternalForm({ ...internalForm, is_critical: checked === true })
                }
              />
              <Label htmlFor="internal-critical">Mark as critical dependency</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInternalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInternal} disabled={createInternalMutation.isPending}>
              {createInternalMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Dependency Dialog */}
      <Dialog open={isAddExternalOpen} onOpenChange={setIsAddExternalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Dependency</DialogTitle>
            <DialogDescription>
              Add an external service dependency
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Namespace *</Label>
              <Select
                value={externalForm.namespace_id}
                onValueChange={(val) => setExternalForm({ ...externalForm, namespace_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select namespace" />
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
              <Label>System Name *</Label>
              <Input
                value={externalForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalForm({ ...externalForm, name: e.target.value })}
                placeholder="e.g., Stripe, AWS S3, Twilio"
              />
            </div>
            <div className="space-y-2">
              <Label>System Type</Label>
              <Select
                value={externalForm.system_type}
                onValueChange={(val) => setExternalForm({ ...externalForm, system_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="payment-gateway">Payment Gateway</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="api">External API</SelectItem>
                  <SelectItem value="database">External Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                value={externalForm.endpoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalForm({ ...externalForm, endpoint: e.target.value })}
                placeholder="https://api.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={externalForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExternalForm({ ...externalForm, description: e.target.value })}
                placeholder="Describe this dependency..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="external-critical"
                checked={externalForm.is_critical}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setExternalForm({ ...externalForm, is_critical: checked === true })
                }
              />
              <Label htmlFor="external-critical">Mark as critical dependency</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExternalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExternal} disabled={createExternalMutation.isPending}>
              {createExternalMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
