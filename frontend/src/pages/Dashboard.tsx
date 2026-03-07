import { useQuery } from '@tanstack/react-query'
import {
  Server,
  Boxes,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dashboardApi } from '@/api'
import { formatRelativeTime } from '@/lib/utils'
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
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    retry: 1,
  })

  const { data: activities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => dashboardApi.getRecentActivities(10),
    retry: 1,
  })

  // Environment data from API
  const envData = stats?.environment_distribution || []

  const coverageData = [
    { name: 'With Owner', value: stats?.namespaces_with_owner || 0 },
    { name: 'Orphaned', value: stats?.orphaned_namespaces || 0 },
  ]

  // Show error state
  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the dashboard data.</p>
        <Button onClick={() => refetchStats()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  // Show loading state
  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Kubernetes envanter genel görünümü
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-blue-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Cluster</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Server className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_clusters || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{stats?.active_clusters || 0}</span> aktif
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-purple-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Namespace</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Boxes className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_namespaces || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tüm cluster'larda
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-green-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sahiplik Oranı</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats?.ownership_percentage || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{stats?.namespaces_with_owner || 0}</span> / {stats?.total_namespaces || 0} atanmış
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-orange-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sahipsiz</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(stats?.orphaned_namespaces || 0) > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {stats?.orphaned_namespaces || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.orphaned_namespaces || 0) > 0 ? 'Atama bekliyor' : 'Tümü atanmış ✓'}
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
            <CardDescription>
              How namespaces are distributed across production, staging, development, and test environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {envData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No environment data available. Sync your cluster to populate.
                </div>
              ) : (
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
              )}
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
                    {coverageData.map((_entry, index) => (
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
              {(stats?.orphaned_namespaces || 0) > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Sahipsiz Namespace'ler</p>
                      <p className="text-sm text-muted-foreground">Altyapı sahibi atanmamış</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {stats?.orphaned_namespaces || 0}
                  </Badge>
                </div>
              )}

              {/* No Dependencies */}
              {(stats?.namespaces_with_dependencies === 0 && (stats?.total_namespaces || 0) > 0) && (
                <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Bağımlılık Tanımlanmamış</p>
                      <p className="text-sm text-muted-foreground">İç/dış bağımlılık ekleyin</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {(stats?.total_namespaces || 0) - (stats?.namespaces_with_dependencies || 0)}
                  </Badge>
                </div>
              )}

              {((stats?.orphaned_namespaces || 0) === 0 && 
                (stats?.total_namespaces || 0) > 0) && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                  Tüm namespace'ler iyi durumda!
                </div>
              )}

              {(stats?.total_namespaces || 0) === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No namespaces found. Sync a cluster to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
