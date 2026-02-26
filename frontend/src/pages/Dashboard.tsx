import { useQuery } from '@tanstack/react-query'
import {
  Server,
  Boxes,
  Users,
  AlertTriangle,
  FileText,
  GitBranch,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { dashboardApi, clustersApi } from '@/api'
import { formatRelativeTime, getEnvironmentColor, getCriticalityColor } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: clusters } = useQuery({
    queryKey: ['clusters-summary'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const { data: activities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => dashboardApi.getRecentActivities(10),
  })

  const { data: missingInfo } = useQuery({
    queryKey: ['missing-info'],
    queryFn: () => dashboardApi.getMissingInfo(5),
  })

  // Mock environment data for chart
  const envData = [
    { name: 'Production', count: 45 },
    { name: 'Staging', count: 28 },
    { name: 'Development', count: 67 },
    { name: 'Test', count: 23 },
  ]

  const coverageData = [
    { name: 'With Owner', value: stats?.namespaces_with_owner || 0 },
    { name: 'Orphaned', value: stats?.orphaned_namespaces || 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Kubernetes inventory
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_clusters || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_clusters || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Namespaces</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_namespaces || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all clusters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ownership Coverage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ownership_percentage || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.namespaces_with_owner || 0} of {stats?.total_namespaces || 0} assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {(stats?.orphaned_namespaces || 0) + (stats?.undocumented_namespaces || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Environment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Namespace Distribution by Environment</CardTitle>
            <CardDescription>Distribution across environments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={envData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ownership Coverage Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Ownership Coverage</CardTitle>
            <CardDescription>Namespaces with assigned owners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={coverageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6">
                {coverageData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {activity.action} {activity.resource_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.resource_name || activity.resource_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {activity.user_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attention Required */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Orphaned Namespaces */}
              {missingInfo?.orphaned && missingInfo.orphaned.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Orphaned Namespaces ({missingInfo.orphaned.length})
                  </p>
                  <div className="space-y-2">
                    {missingInfo.orphaned.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-muted p-2"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="outline">No owner</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Undocumented */}
              {missingInfo?.undocumented && missingInfo.undocumented.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Missing Documentation ({missingInfo.undocumented.length})
                  </p>
                  <div className="space-y-2">
                    {missingInfo.undocumented.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-muted p-2"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="outline">No docs</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!missingInfo?.orphaned?.length && !missingInfo?.undocumented?.length) && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                  All namespaces are in good shape!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
