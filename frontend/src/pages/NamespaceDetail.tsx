import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  Users,
  FileText,
  GitBranch,
  Clock,
  Mail,
  Building,
  Edit,
  Server,
  Download,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { namespacesApi, teamsApi, businessUnitsApi, documentsApi } from '@/api'
import { getEnvironmentColor, getCriticalityColor, formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { Namespace } from '@/types'

export default function NamespaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'overview'
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    description: '',
    environment: '',
    criticality: '',
    infrastructure_owner_team_id: '',
    business_unit_id: '',
    application_manager_name: '',
    application_manager_email: '',
    application_manager_phone: '',
    technical_lead_name: '',
    technical_lead_email: '',
    project_manager_name: '',
    project_manager_email: '',
    sla_availability: '',
    sla_rto: '',
    sla_rpo: '',
    support_hours: '',
    escalation_path: '',
  })

  const { data: namespace, isLoading } = useQuery({
    queryKey: ['namespace', id],
    queryFn: () => namespacesApi.getById(id!),
    enabled: !!id,
  })

  const { data: teamsData } = useQuery({
    queryKey: ['teams-select'],
    queryFn: teamsApi.list,
  })

  const { data: businessUnitsData } = useQuery({
    queryKey: ['business-units-select'],
    queryFn: businessUnitsApi.list,
  })

  const { data: dependencies } = useQuery({
    queryKey: ['namespace-dependencies', id],
    queryFn: () => namespacesApi.getDependencies(id!),
    enabled: !!id,
  })

  const { data: documents } = useQuery({
    queryKey: ['namespace-documents', id],
    queryFn: () => namespacesApi.getDocuments(id!),
    enabled: !!id,
  })

  const { data: history } = useQuery({
    queryKey: ['namespace-history', id],
    queryFn: () => namespacesApi.getHistory(id!, 20),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Namespace>) => namespacesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['namespace', id] })
      queryClient.invalidateQueries({ queryKey: ['namespaces'] })
      setIsEditOpen(false)
    },
  })

  const teams = Array.isArray(teamsData) ? teamsData : []
  const businessUnits: any[] = Array.isArray(businessUnitsData) ? businessUnitsData : (businessUnitsData as any)?.items || []

  const handleEditClick = () => {
    if (namespace) {
      setEditForm({
        display_name: namespace.display_name || '',
        description: namespace.description || '',
        environment: namespace.environment || 'unknown',
        criticality: namespace.criticality || 'tier-3',
        infrastructure_owner_team_id: namespace.infrastructure_owner_team_id || '',
        business_unit_id: namespace.business_unit_id || '',
        application_manager_name: namespace.application_manager_name || '',
        application_manager_email: namespace.application_manager_email || '',
        application_manager_phone: namespace.application_manager_phone || '',
        technical_lead_name: namespace.technical_lead_name || '',
        technical_lead_email: namespace.technical_lead_email || '',
        project_manager_name: namespace.project_manager_name || '',
        project_manager_email: namespace.project_manager_email || '',
        sla_availability: namespace.sla_availability || '',
        sla_rto: namespace.sla_rto || '',
        sla_rpo: namespace.sla_rpo || '',
        support_hours: namespace.support_hours || '',
        escalation_path: namespace.escalation_path || '',
      })
      setIsEditOpen(true)
    }
  }

  const handleSave = () => {
    const data: any = {
      display_name: editForm.display_name || undefined,
      description: editForm.description || undefined,
      environment: editForm.environment || undefined,
      criticality: editForm.criticality || undefined,
      application_manager_name: editForm.application_manager_name || undefined,
      application_manager_email: editForm.application_manager_email || undefined,
      application_manager_phone: editForm.application_manager_phone || undefined,
      technical_lead_name: editForm.technical_lead_name || undefined,
      technical_lead_email: editForm.technical_lead_email || undefined,
      project_manager_name: editForm.project_manager_name || undefined,
      project_manager_email: editForm.project_manager_email || undefined,
      sla_availability: editForm.sla_availability || undefined,
      sla_rto: editForm.sla_rto || undefined,
      sla_rpo: editForm.sla_rpo || undefined,
      support_hours: editForm.support_hours || undefined,
      escalation_path: editForm.escalation_path || undefined,
    }
    
    // Only include UUID fields if they have valid values
    if (editForm.infrastructure_owner_team_id && editForm.infrastructure_owner_team_id.length > 0) {
      data.infrastructure_owner_team_id = editForm.infrastructure_owner_team_id
    }
    if (editForm.business_unit_id && editForm.business_unit_id.length > 0) {
      data.business_unit_id = editForm.business_unit_id
    }
    
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!namespace) {
    return (
      <div className="text-center py-12">
        <p>Namespace not found</p>
        <Button onClick={() => navigate('/namespaces')} className="mt-4">
          Back to Namespaces
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/namespaces')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{namespace.name}</h1>
              {namespace.display_name && (
                <p className="text-muted-foreground">{namespace.display_name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {namespace.environment && (
            <Badge className={getEnvironmentColor(namespace.environment)}>
              {namespace.environment}
            </Badge>
          )}
          <Badge className={getCriticalityColor(namespace.criticality)}>
            {namespace.criticality}
          </Badge>
        </div>
        <Button onClick={handleEditClick}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cluster</p>
                <p className="font-semibold">
                  {namespace.cluster?.display_name || namespace.cluster?.name || 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Owner Team</p>
                <p className="font-semibold">
                  {namespace.infrastructure_owner_team?.name || 'Not assigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Business Unit</p>
                <p className="font-semibold">
                  {namespace.business_unit?.name || 'Not assigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="font-semibold">
                  {namespace.last_sync_at ? formatRelativeTime(namespace.last_sync_at) : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="dependencies">
            Dependencies ({(dependencies?.internal?.length || 0) + (dependencies?.external?.length || 0)})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({documents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {namespace.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {namespace.k8s_labels && Object.keys(namespace.k8s_labels).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Kubernetes Labels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(namespace.k8s_labels).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{namespace.application_manager_name || '-'}</p>
                {namespace.application_manager_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {namespace.application_manager_email}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{namespace.technical_lead_name || '-'}</p>
                {namespace.technical_lead_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {namespace.technical_lead_email}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{namespace.project_manager_name || '-'}</p>
                {namespace.project_manager_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {namespace.project_manager_email}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>SLA Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className="font-medium">{namespace.sla_availability || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RTO</span>
                  <span className="font-medium">{namespace.sla_rto || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RPO</span>
                  <span className="font-medium">{namespace.sla_rpo || '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Support Hours</span>
                  <span className="font-medium">{namespace.support_hours || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Escalation Path</span>
                  <p className="mt-1">{namespace.escalation_path || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Internal Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dependencies?.internal && dependencies.internal.length > 0 ? (
                  <ul className="space-y-2">
                    {dependencies.internal.map((dep: any) => (
                      <li key={dep.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{dep.target_namespace?.name || dep.target_namespace_id}</span>
                        <Badge variant="outline">{dep.dependency_type}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No internal dependencies</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  External Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dependencies?.external && dependencies.external.length > 0 ? (
                  <ul className="space-y-2">
                    {dependencies.external.map((dep: any) => (
                      <li key={dep.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{dep.system_name}</span>
                        <Badge variant="outline">{dep.system_type}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No external dependencies</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.file_type?.toUpperCase() || 'Document'} • {formatRelativeTime(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => documentsApi.download(doc.id, doc.name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            İndir
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(documentsApi.getDownloadUrl(doc.id), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Henüz döküman eklenmemiş</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Documents sayfasından bu namespace için döküman yükleyebilirsiniz
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <ul className="space-y-3">
                  {history.map((entry: any) => (
                    <li key={entry.id} className="flex items-start gap-3 p-2 border-b last:border-0">
                      <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{entry.user?.email || 'System'}</span>
                          {' '}{entry.action}{' '}
                          <span className="text-muted-foreground">{entry.resource_type}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Namespace: {namespace.name}</DialogTitle>
            <DialogDescription>
              Update namespace metadata and ownership information
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    placeholder="Human-friendly name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={editForm.environment}
                    onValueChange={(val) => setEditForm({ ...editForm, environment: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Criticality</Label>
                  <Select
                    value={editForm.criticality}
                    onValueChange={(val) => setEditForm({ ...editForm, criticality: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier-1">Tier 1 - Critical</SelectItem>
                      <SelectItem value="tier-2">Tier 2 - Important</SelectItem>
                      <SelectItem value="tier-3">Tier 3 - Standard</SelectItem>
                      <SelectItem value="tier-4">Tier 4 - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Namespace description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Ownership */}
            <div className="space-y-4">
              <h3 className="font-semibold">Ownership</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Owner Team</Label>
                  <Select
                    value={editForm.infrastructure_owner_team_id || 'none'}
                    onValueChange={(val) => setEditForm({ ...editForm, infrastructure_owner_team_id: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team assigned</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Business Unit</Label>
                  <Select
                    value={editForm.business_unit_id || 'none'}
                    onValueChange={(val) => setEditForm({ ...editForm, business_unit_id: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No business unit assigned</SelectItem>
                      {businessUnits.map((bu: any) => (
                        <SelectItem key={bu.id} value={bu.id}>
                          {bu.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contacts</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Application Manager</Label>
                  <Input
                    value={editForm.application_manager_name}
                    onChange={(e) => setEditForm({ ...editForm, application_manager_name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    type="email"
                    value={editForm.application_manager_email}
                    onChange={(e) => setEditForm({ ...editForm, application_manager_email: e.target.value })}
                    placeholder="Email"
                  />
                  <Input
                    value={editForm.application_manager_phone}
                    onChange={(e) => setEditForm({ ...editForm, application_manager_phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Technical Lead</Label>
                  <Input
                    value={editForm.technical_lead_name}
                    onChange={(e) => setEditForm({ ...editForm, technical_lead_name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    type="email"
                    value={editForm.technical_lead_email}
                    onChange={(e) => setEditForm({ ...editForm, technical_lead_email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Project Manager</Label>
                  <Input
                    value={editForm.project_manager_name}
                    onChange={(e) => setEditForm({ ...editForm, project_manager_name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    type="email"
                    value={editForm.project_manager_email}
                    onChange={(e) => setEditForm({ ...editForm, project_manager_email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
              </div>
            </div>

            {/* SLA */}
            <div className="space-y-4">
              <h3 className="font-semibold">SLA & Support</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Input
                    value={editForm.sla_availability}
                    onChange={(e) => setEditForm({ ...editForm, sla_availability: e.target.value })}
                    placeholder="e.g., 99.9%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RTO</Label>
                  <Input
                    value={editForm.sla_rto}
                    onChange={(e) => setEditForm({ ...editForm, sla_rto: e.target.value })}
                    placeholder="e.g., 4 hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RPO</Label>
                  <Input
                    value={editForm.sla_rpo}
                    onChange={(e) => setEditForm({ ...editForm, sla_rpo: e.target.value })}
                    placeholder="e.g., 1 hour"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Hours</Label>
                  <Input
                    value={editForm.support_hours}
                    onChange={(e) => setEditForm({ ...editForm, support_hours: e.target.value })}
                    placeholder="e.g., 24/7"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Escalation Path</Label>
                  <Input
                    value={editForm.escalation_path}
                    onChange={(e) => setEditForm({ ...editForm, escalation_path: e.target.value })}
                    placeholder="Escalation procedure"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
