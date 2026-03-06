import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  ChevronRight,
  Boxes,
  RefreshCw,
  AlertTriangle,
  Trash,
  Edit,
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
import { businessUnitsApi } from '@/api'
import { BusinessUnit } from '@/types'
import { Label } from '@/components/ui/label'

export default function BusinessUnits() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null)
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

  const createMutation = useMutation({
    mutationFn: (unitData: Partial<BusinessUnit>) => businessUnitsApi.create(unitData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
      setIsCreateOpen(false)
      resetForm()
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
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessUnitsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] })
    },
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
  }

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
    setIsEditOpen(true)
  }

  const handleUpdate = () => {
    if (editingUnit && formData.name.trim()) {
      updateMutation.mutate({ id: editingUnit.id, data: formData })
    }
  }

  const businessUnits: BusinessUnit[] = Array.isArray(data) ? data : []

  const filteredUnits = businessUnits.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(unit)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this business unit?')) {
                            deleteMutation.mutate(unit.id)
                          }
                        }}
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
                  <ChevronRight className="h-4 w-4" />
                </div>
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
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., Digital Banking"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-code">Code</Label>
              <Input
                id="create-code"
                placeholder="e.g., DB"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                placeholder="Brief description of the business unit"
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
            <DialogDescription>
              Update business unit information
            </DialogDescription>
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
                placeholder="Brief description of the business unit"
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
    </div>
  )
}
