import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { auditApi } from '@/api'
import { AuditLog } from '@/types'
import { PageHeader, LoadingPage, EmptyState } from '@/components/ui/common'
import { formatRelativeTime } from '@/lib/utils'

const actionColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  login: 'bg-purple-500',
  logout: 'bg-gray-500',
  view: 'bg-cyan-500',
  export: 'bg-orange-500',
}

const resourceIcons: Record<string, string> = {
  cluster: '🖥️',
  namespace: '📦',
  team: '👥',
  user: '👤',
  document: '📄',
  internal_dependency: '🔗',
  external_dependency: '🌐',
}

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const { data: logsResult, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, resourceFilter],
    queryFn: () =>
      auditApi.list({
        page,
        page_size: 50,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(resourceFilter !== 'all' && { resource_type: resourceFilter }),
      }),
  })

  if (isLoading) {
    return <LoadingPage message="Loading audit logs..." />
  }

  const logs = logsResult?.data || []
  const total = logsResult?.total || 0

  // Get unique actions and resource types for filters
  const uniqueActions = ['create', 'update', 'delete', 'login', 'logout', 'view', 'export']
  const uniqueResources = ['cluster', 'namespace', 'team', 'user', 'document', 'internal_dependency', 'external_dependency']

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all changes and activities across your organization"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Creates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {logs.filter((l) => l.action === 'create').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {logs.filter((l) => l.action === 'update').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deletes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {logs.filter((l) => l.action === 'delete').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user, resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {uniqueResources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {logs.length > 0 ? (
        <div className="space-y-2">
          {logs
            .filter(
              (log) =>
                !searchQuery ||
                log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.resource_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((log) => (
              <AuditLogCard
                key={log.id}
                log={log}
                isExpanded={expandedLog === log.id}
                onToggle={() =>
                  setExpandedLog(expandedLog === log.id ? null : log.id)
                }
              />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={<Shield className="h-6 w-6 text-muted-foreground" />}
          title="No audit logs found"
          description="All activities will be recorded here"
        />
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * 50 >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditLogCard({
  log,
  isExpanded,
  onToggle,
}: {
  log: AuditLog
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {/* Action Badge */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
            actionColors[log.action] || 'bg-gray-500'
          }`}
        >
          <Activity className="h-4 w-4" />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{log.action}</span>
            <span className="text-muted-foreground">
              {resourceIcons[log.resource_type] || '📁'}
            </span>
            <span className="text-muted-foreground">{log.resource_type.replace('_', ' ')}</span>
            {log.resource_name && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium truncate">{log.resource_name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{log.user_email || 'System'}</span>
            <span>•</span>
            <Calendar className="h-3 w-3" />
            <span>{formatRelativeTime(log.created_at)}</span>
            {log.user_ip && (
              <>
                <span>•</span>
                <span>IP: {log.user_ip}</span>
              </>
            )}
          </div>
        </div>

        {/* Expand Button */}
        <Button variant="ghost" size="icon">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {/* Changed Fields */}
          {log.changed_fields && log.changed_fields.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Changed Fields</p>
              <div className="flex flex-wrap gap-2">
                {log.changed_fields.map((field) => (
                  <Badge key={field} variant="outline">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Old Values */}
          {log.old_values && Object.keys(log.old_values).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Previous Values</p>
              <pre className="text-xs bg-muted p-2 rounded-lg overflow-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}

          {/* New Values */}
          {log.new_values && Object.keys(log.new_values).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">New Values</p>
              <pre className="text-xs bg-muted p-2 rounded-lg overflow-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}

          {/* Description */}
          {log.description && (
            <div>
              <p className="text-sm font-medium mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{log.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>ID: {log.id}</span>
            <span>Resource ID: {log.resource_id}</span>
            {log.user_agent && (
              <span className="truncate max-w-[300px]">
                User Agent: {log.user_agent}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
