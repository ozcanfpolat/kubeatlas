import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  ChevronRight,
  Boxes,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { businessUnitsApi } from '@/api'
import { BusinessUnit } from '@/types'
import { Label } from '@/components/ui/label'

export default function BusinessUnits() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-units'],
    queryFn: businessUnitsApi.list,
    retry: 1,
  })

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Units</h1>
          <p className="text-muted-foreground">
            Manage organizational structure and namespace assignments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Business Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Business Unit</DialogTitle>
              <DialogDescription>
                Add a new business unit to your organization structure
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="e.g., Digital Banking" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="e.g., DB" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Brief description" />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button">Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
            <BusinessUnitCard key={unit.id} unit={unit} />
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
              <Button onClick={() => setIsCreateOpen(true)}>
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
            <CardDescription>Hierarchical view of business units</CardDescription>
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
    </div>
  )
}

function BusinessUnitCard({ unit }: { unit: BusinessUnit }) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
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
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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
