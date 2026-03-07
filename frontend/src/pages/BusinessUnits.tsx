import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Boxes,
  RefreshCw,
  AlertTriangle,
  Trash,
  Edit,
  MoreVertical,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { businessUnitsApi, namespacesApi, clustersApi } from '@/api'
import { BusinessUnit, Namespace, Cluster } from '@/types'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function BusinessUnits() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assigningUnit, setAssigningUnit] = useState<BusinessUnit | null>(null)
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
  const [clusterFilter, setClusterFilter] = useState<string>('all')
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-units'],
    queryFn: businessUnitsApi.list,
    retry: 1,
  })

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-for-bu'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const { data: namespacesData } = useQuery({
    queryKey: ['namespaces-for-bu', clusterFilter],
    queryFn: () => namespacesApi.list({ 
      page: 1, 
      page_size: 500,
      cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
    }),
    enabled: isAssignOpen,
  })

  // Get namespaces for expanded business unit
  const { data: unitNamespacesData } = useQuery({
    queryKey: ['unit-namespaces', expandedUnit],
    queryFn: () => namespacesApi.list({ 
      page: 1, 
      page_size: 100,
      business_unit_id: expandedUnit!,
    }),
    enabled: !!expandedUnit,
  })

  const createMutation = useMutation({
    mutationFn: (unitData: Partial<BusinessUnit>) => businessUnitsApi.create(unitData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
      setIsCreateOpen(false)
      resetForm()
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create business unit. You may need admin permissions.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BusinessUnit> }) => 
      businessUnitsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
      setIsEditOpen(false)
      setEditingUnit(null)
      resetForm()
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update business unit. You may need admin permissions.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessUnitsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to delete business unit')
    },
  })

  const assignNamespacesMutation = useMutation({
    mutationFn: async ({ namespaceIds, businessUnitId }: { namespaceIds: string[], businessUnitId: string }) => {
      // Update each namespace's business_unit_id
      await Promise.all(
        namespaceIds.map(nsId => 
          namespacesApi.update(nsId, { business_unit_id: businessUnitId })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
      queryClient.invalidateQueries({ queryKey: ['namespaces'] })
      setIsAssignOpen(false)
      setAssigningUnit(null)
      setSelectedNamespaces([])
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to assign namespaces')
    },
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
    setError(null)
  }

  const handleOpenAssign = (unit: BusinessUnit) => {
    setAssigningUnit(unit)
    setSelectedNamespaces([])
    setClusterFilter('all')
    setIsAssignOpen(true)
  }

  const handleAssignNamespaces = () => {
    if (assigningUnit && selectedNamespaces.length > 0) {
      assignNamespacesMutation.mutate({
        namespaceIds: selectedNamespaces,
        businessUnitId: assigningUnit.id,
      })
    }
  }

  const toggleNamespace = (nsId: string) => {
    setSelectedNamespaces(prev => 
      prev.includes(nsId) 
        ? prev.filter(id => id !== nsId)
        : [...prev, nsId]
    )
  }

  const clusters: Cluster[] = clustersData?.items || []
  const namespaces: Namespace[] = namespacesData?.items || []

  const handleCreate = () => {
    if (formData.name.trim()) {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (unit: BusinessUnit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name || '',
      code: unit.code || '',
      description: unit.description || '',
    })
    setError(null)
    setIsEditOpen(true)
  }

  const handleUpdate = () => {
    if (editingUnit && formData.name.trim()) {
      updateMutation.mutate({ id: editingUnit.id, data: formData })
    }
  }

  // Defensive: ensure businessUnits is always an array
  const businessUnits: BusinessUnit[] = Array.isArray(data) ? data : []

  const filteredUnits = businessUnits.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Build tree structure
  const buildTree = (units: BusinessUnit[], parentId: string | null = null): (BusinessUnit & { children?: BusinessUnit[] })[] => {
    return units
      .filter((unit) => unit.parent_id === parentId)
      .map((unit) => ({
        ...unit,
        children: buildTree(units, unit.id),
      }))
  }

  const tree = buildTree(businessUnits)

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Business Units</h1>
            <p className="text-muted-foreground">Manage organizational structure and namespace assignments</p>
          </div>
        </div>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full border-2 border-primary border-t-transparent h-8 w-8" />
          <p className="text-muted-foreground">Loading business units...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Business Units</h1>
            <p className="text-muted-foreground">Manage organizational structure and namespace assignments</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load business units</h3>
            <p className="text-muted-foreground mb-4">There was an error loading the business unit data.</p>
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
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Units</h1>
          <p className="text-muted-foreground">
            Manage organizational structure and namespace assignments
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Business Unit
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search business units..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredUnits.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <Card key={unit.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{unit.name}</CardTitle>
                      {unit.code && (
                        <Badge variant="outline" className="mt-1">
                          {unit.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenAssign(unit)}>
                        <Boxes className="mr-2 h-4 w-4" />
                        Assign Namespaces
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(unit)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(unit.id)}
                        className="text-destructive"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {unit.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {unit.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Boxes className="h-4 w-4" />
                    <span>{unit.namespace_count || 0} namespaces</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                  >
                    {expandedUnit === unit.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Assigned Namespaces */}
                {expandedUnit === unit.id && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Atanmış Namespace'ler</p>
                    {unitNamespacesData?.items && unitNamespacesData.items.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {unitNamespacesData.items.map((ns: Namespace) => (
                          <div key={ns.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{ns.name}</span>
                            {ns.environment && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {ns.environment}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Henüz namespace atanmamış</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No business units found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first business unit to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Business Unit
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tree View */}
      {tree.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Organization Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {tree.map((unit) => (
                <TreeNode key={unit.id} unit={unit} level={0} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Business Unit</DialogTitle>
            <DialogDescription>
              Add a new business unit to your organization structure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Digital Banking"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g., DB"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.name.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Unit</DialogTitle>
            <DialogDescription>Update business unit information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Digital Banking"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                placeholder="e.g., DB"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || !formData.name.trim()}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Namespaces Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Namespaces to {assigningUnit?.name}</DialogTitle>
            <DialogDescription>
              Select namespaces to assign to this business unit
            </DialogDescription>
          </DialogHeader>
          
          {/* Cluster Filter */}
          <div className="flex items-center gap-4 py-2">
            <Label className="text-sm font-medium">Filter by Cluster:</Label>
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

          {/* Namespace List */}
          <div className="flex-1 overflow-auto border rounded-lg p-2 min-h-[300px]">
            {namespaces.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No namespaces found
              </p>
            ) : (
              <div className="space-y-1">
                {namespaces.map((ns) => {
                  const cluster = clusters.find(c => c.id === ns.cluster_id)
                  return (
                    <div
                      key={ns.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleNamespace(ns.id)}
                    >
                      <Checkbox
                        checked={selectedNamespaces.includes(ns.id)}
                        onCheckedChange={() => toggleNamespace(ns.id)}
                      />
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ns.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cluster?.name || 'Unknown cluster'}
                          {ns.business_unit_id && ' • Already assigned'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedNamespaces.length} namespace(s) selected
            </div>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignNamespaces} 
              disabled={assignNamespacesMutation.isPending || selectedNamespaces.length === 0}
            >
              {assignNamespacesMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TreeNode({ unit, level }: { unit: BusinessUnit & { children?: BusinessUnit[] }; level: number }) {
  const [isExpanded, setIsExpanded] = useState(level === 0)
  const hasChildren = unit.children && unit.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <div className="w-4" />
        )}
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{unit.name}</span>
        {unit.code && (
          <Badge variant="outline" className="text-xs">
            {unit.code}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {unit.namespace_count || 0} namespaces
        </span>
      </div>
      {isExpanded && unit.children?.map((child) => (
        <TreeNode key={child.id} unit={child as BusinessUnit & { children?: BusinessUnit[] }} level={level + 1} />
      ))}
    </div>
  )
}
