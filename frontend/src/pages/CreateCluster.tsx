import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Server, Shield, AlertTriangle, Upload, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clustersApi, teamsApi } from '@/api'
import type { CreateClusterRequest, Team } from '@/types'

export default function CreateCluster() {
  const navigate = useNavigate()
  const [showToken, setShowToken] = useState(false)
  const [authMethod, setAuthMethod] = useState('serviceaccount')
  const [formData, setFormData] = useState<CreateClusterRequest>({
    name: '',
    display_name: '',
    description: '',
    api_server_url: '',
    cluster_type: 'kubernetes',
    environment: 'production',
    platform: '',
    region: '',
    auth_method: 'serviceaccount',
    service_account_token: '',
    kubeconfig: '',
    ca_certificate: '',
    skip_tls_verify: false,
    tags: [],
  })
  const [error, setError] = useState<string | null>(null)

  const { data: teamsResponse } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateClusterRequest) => clustersApi.create(data),
    onSuccess: () => {
      navigate('/clusters')
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create cluster')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Cluster name is required')
      return
    }
    if (!formData.api_server_url.trim()) {
      setError('API Server URL is required')
      return
    }
    if (authMethod === 'serviceaccount' && !formData.service_account_token?.trim()) {
      setError('Service Account Token is required')
      return
    }
    if (authMethod === 'kubeconfig' && !formData.kubeconfig?.trim()) {
      setError('Kubeconfig is required')
      return
    }

    createMutation.mutate({
      ...formData,
      auth_method: authMethod,
    })
  }

  const handleFileUpload = (field: 'kubeconfig' | 'ca_certificate') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      // Convert to base64
      const base64 = btoa(content)
      setFormData(prev => ({ ...prev, [field]: base64 }))
    }
    reader.readAsText(file)
  }

  // Handle different response formats from backend
  const teams = Array.isArray(teamsResponse) 
    ? teamsResponse 
    : ((teamsResponse as { items?: Team[] } | undefined)?.items || [])

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clusters">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Cluster</h1>
          <p className="text-muted-foreground">Connect a Kubernetes cluster to KubeAtlas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>General cluster information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Cluster Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., prod-cluster-01"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">Unique identifier for this cluster</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="e.g., Production Cluster 01"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_server_url">API Server URL *</Label>
              <Input
                id="api_server_url"
                placeholder="https://kubernetes.example.com:6443"
                value={formData.api_server_url}
                onChange={(e) => setFormData(prev => ({ ...prev, api_server_url: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cluster_type">Cluster Type</Label>
                <Select
                  value={formData.cluster_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cluster_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kubernetes">Kubernetes</SelectItem>
                    <SelectItem value="openshift">OpenShift</SelectItem>
                    <SelectItem value="rke2">RKE2</SelectItem>
                    <SelectItem value="eks">Amazon EKS</SelectItem>
                    <SelectItem value="aks">Azure AKS</SelectItem>
                    <SelectItem value="gke">Google GKE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_team_id">Owner Team</Label>
                <Select
                  value={formData.owner_team_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, owner_team_id: value === 'none' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Owner</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Input
                  id="platform"
                  placeholder="e.g., VMware vSphere, AWS, Azure"
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  placeholder="e.g., eu-central-1, westeurope"
                  value={formData.region}
                  onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe this cluster..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>How KubeAtlas will connect to this cluster</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMethod} onValueChange={setAuthMethod}>
              <TabsList className="mb-4">
                <TabsTrigger value="serviceaccount">Service Account Token</TabsTrigger>
                <TabsTrigger value="kubeconfig">Kubeconfig File</TabsTrigger>
              </TabsList>

              <TabsContent value="serviceaccount" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service_account_token">Service Account Token *</Label>
                  <div className="relative">
                    <textarea
                      id="service_account_token"
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-10"
                      placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                      value={formData.service_account_token}
                      onChange={(e) => setFormData(prev => ({ ...prev, service_account_token: e.target.value }))}
                      style={{ WebkitTextSecurity: showToken ? 'none' : 'disc' } as React.CSSProperties}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create a ServiceAccount with appropriate RBAC permissions and paste its token here.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="kubeconfig" className="space-y-4">
                <div className="space-y-2">
                  <Label>Kubeconfig File *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload your kubeconfig file or paste its contents below
                    </p>
                    <input
                      type="file"
                      accept=".yaml,.yml,.conf"
                      onChange={handleFileUpload('kubeconfig')}
                      className="hidden"
                      id="kubeconfig-upload"
                    />
                    <label htmlFor="kubeconfig-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Choose File</span>
                      </Button>
                    </label>
                  </div>
                  {formData.kubeconfig && (
                    <p className="text-xs text-green-500">✓ Kubeconfig loaded</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* CA Certificate for Self-Signed */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4">TLS Certificate (Optional)</h4>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="skip_tls_verify"
                    checked={formData.skip_tls_verify}
                    onChange={(e) => setFormData(prev => ({ ...prev, skip_tls_verify: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="skip_tls_verify" className="text-sm font-normal">
                    Skip TLS verification (not recommended for production)
                  </Label>
                </div>

                {!formData.skip_tls_verify && (
                  <div className="space-y-2">
                    <Label>CA Certificate (for self-signed certificates)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        If your cluster uses a self-signed certificate, upload the CA certificate here
                      </p>
                      <input
                        type="file"
                        accept=".pem,.crt,.cer"
                        onChange={handleFileUpload('ca_certificate')}
                        className="hidden"
                        id="ca-cert-upload"
                      />
                      <label htmlFor="ca-cert-upload">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Upload CA Certificate</span>
                        </Button>
                      </label>
                    </div>
                    {formData.ca_certificate && (
                      <p className="text-xs text-green-500">✓ CA Certificate loaded</p>
                    )}
                  </div>
                )}

                {formData.skip_tls_verify && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm text-yellow-600">
                      <strong>Security Warning:</strong> Skipping TLS verification makes the connection vulnerable to man-in-the-middle attacks. Use only in development/test environments.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link to="/clusters">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Cluster'}
          </Button>
        </div>
      </form>
    </div>
  )
}
