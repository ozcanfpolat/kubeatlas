// NamespaceDetail.tsx
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  Users,
  FileText,
  GitBranch,
  Clock,
  Mail,
  Phone,
  Building,
  Edit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { namespacesApi } from '@/api'
import { getEnvironmentColor, getCriticalityColor, formatDateTime, formatRelativeTime } from '@/lib/utils'

export default function NamespaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: namespace, isLoading } = useQuery({
    queryKey: ['namespace', id],
    queryFn: () => namespacesApi.getById(id!),
    enabled: !!id,
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
        <div className="flex gap-2">
          {namespace.environment && (
            <Badge className={getEnvironmentColor(namespace.environment)}>
              {namespace.environment}
            </Badge>
          )}
          <Badge className={getCriticalityColor(namespace.criticality)}>
            {namespace.criticality}
          </Badge>
        </div>
        <Button>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="font-semibold">{documents?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Dependencies</p>
                <p className="font-semibold">
                  {(dependencies?.internal?.length || 0) + (dependencies?.external?.length || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Cluster</dt>
                  <dd className="font-medium">{namespace.cluster?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Description</dt>
                  <dd className="font-medium">{namespace.description || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">SLA Availability</dt>
                  <dd className="font-medium">{namespace.sla_availability || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Support Hours</dt>
                  <dd className="font-medium">{namespace.support_hours || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDateTime(namespace.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Last Updated</dt>
                  <dd className="font-medium">{formatRelativeTime(namespace.updated_at)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {namespace.application_manager_name && (
                <div>
                  <h4 className="font-medium mb-2">Application Manager</h4>
                  <p>{namespace.application_manager_name}</p>
                  {namespace.application_manager_email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-4 w-4" /> {namespace.application_manager_email}
                    </p>
                  )}
                </div>
              )}
              {namespace.technical_lead_name && (
                <div>
                  <h4 className="font-medium mb-2">Technical Lead</h4>
                  <p>{namespace.technical_lead_name}</p>
                  {namespace.technical_lead_email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-4 w-4" /> {namespace.technical_lead_email}
                    </p>
                  )}
                </div>
              )}
              {!namespace.application_manager_name && !namespace.technical_lead_name && (
                <p className="text-muted-foreground">No contact information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              {(!dependencies?.internal?.length && !dependencies?.external?.length) ? (
                <p className="text-muted-foreground">No dependencies defined</p>
              ) : (
                <div className="space-y-4">
                  {dependencies?.internal?.map((dep) => (
                    <div key={dep.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">
                          {dep.source_namespace?.name} → {dep.target_namespace?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{dep.dependency_type}</p>
                      </div>
                      {dep.is_critical && <Badge variant="destructive">Critical</Badge>}
                    </div>
                  ))}
                  {dependencies?.external?.map((dep) => (
                    <div key={dep.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{dep.name}</p>
                        <p className="text-sm text-muted-foreground">{dep.system_type} - {dep.provider}</p>
                      </div>
                      {dep.is_critical && <Badge variant="destructive">Critical</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!documents?.length ? (
                <p className="text-muted-foreground">No documents uploaded</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
            </CardHeader>
            <CardContent>
              {!history?.length ? (
                <p className="text-muted-foreground">No history available</p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 border-b pb-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.user_email} - {formatRelativeTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
