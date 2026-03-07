import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  FileText,
  Download,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dashboardApi } from '@/api'
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts'



export default function Reports() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: missingInfo } = useQuery({
    queryKey: ['missing-info-report'],
    queryFn: () => dashboardApi.getMissingInfo(100),
  })

  // Generate and download CSV report
  const downloadReport = () => {
    if (!stats) return
    
    const reportData = [
      ['KubeAtlas Raporu', new Date().toLocaleDateString('tr-TR')],
      [''],
      ['Genel İstatistikler'],
      ['Toplam Namespace', stats.total_namespaces || 0],
      ['Sahipli Namespace', stats.namespaces_with_owner || 0],
      ['Dokümanlı Namespace', stats.namespaces_documented || 0],
      ['Bağımlılık Tanımlı', stats.namespaces_with_dependencies || 0],
      [''],
      ['Eksiklikler'],
      ['Sahipsiz Namespace', (stats.total_namespaces || 0) - (stats.namespaces_with_owner || 0)],
      ['Dokümansız Namespace', (stats.total_namespaces || 0) - (stats.namespaces_documented || 0)],
      [''],
      ['Sahipsiz Namespace Listesi'],
    ]
    
    if (missingInfo?.orphaned) {
      missingInfo.orphaned.forEach((item: any) => {
        reportData.push([item.name, item.cluster?.name || '-'])
      })
    }
    
    reportData.push([''])
    reportData.push(['Dokümansız Namespace Listesi'])
    
    if (missingInfo?.undocumented) {
      missingInfo.undocumented.forEach((item: any) => {
        reportData.push([item.name, item.cluster?.name || '-'])
      })
    }
    
    const csvContent = reportData.map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kubeatlas-rapor-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Prepare chart data
  const coverageData = [
    { 
      name: 'Sahiplik', 
      tamamlanan: stats?.namespaces_with_owner || 0,
      eksik: (stats?.total_namespaces || 0) - (stats?.namespaces_with_owner || 0)
    },
    { 
      name: 'Dokümantasyon', 
      tamamlanan: stats?.namespaces_documented || 0,
      eksik: (stats?.total_namespaces || 0) - (stats?.namespaces_documented || 0)
    },
    { 
      name: 'Bağımlılık', 
      tamamlanan: stats?.namespaces_with_dependencies || 0,
      eksik: (stats?.total_namespaces || 0) - (stats?.namespaces_with_dependencies || 0)
    },
  ]

  

  const criticalityData = [
    { name: 'Tier 1', value: 25, color: '#ef4444' },
    { name: 'Tier 2', value: 55, color: '#eab308' },
    { name: 'Tier 3', value: 80, color: '#22c55e' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground mt-1">
            Envanter analizi ve eksiklik raporları
          </p>
        </div>
        <Button variant="outline" onClick={downloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Rapor İndir
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Namespace</p>
                <p className="text-2xl font-bold">{stats?.total_namespaces || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sahiplik Oranı</p>
                <p className="text-2xl font-bold text-green-500">
                  %{stats?.ownership_percentage || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dokümantasyon</p>
                <p className="text-2xl font-bold text-blue-500">
                  %{stats?.documentation_percentage || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sahipsiz NS</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.orphaned_namespaces || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coverage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tamamlanma Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tamamlanan" fill="#22c55e" name="Tamamlanan" stackId="a" />
                  <Bar dataKey="eksik" fill="#ef4444" name="Eksik" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Criticality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kritiklik Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={criticalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {criticalityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orphaned Namespaces Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sahipsiz Namespace'ler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingInfo?.orphaned && missingInfo.orphaned.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium">Namespace</th>
                    <th className="text-left p-3 font-medium">Cluster</th>
                    <th className="text-left p-3 font-medium">Eksik Bilgi</th>
                    <th className="text-right p-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {missingInfo.orphaned.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="p-3 font-mono text-sm">
                        <Link to={`/namespaces/${item.id}`} className="hover:text-primary">
                          {item.name}
                        </Link>
                      </td>
                      <td className="p-3">{item.cluster?.name || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                          Sahip Atanmamış
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link to={`/namespaces/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Düzenle
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Harika! Tüm namespace'lerin sahibi atanmış.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Undocumented Namespaces */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Dokümansız Namespace'ler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingInfo?.undocumented && missingInfo.undocumented.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium">Namespace</th>
                    <th className="text-left p-3 font-medium">Cluster</th>
                    <th className="text-left p-3 font-medium">Durum</th>
                    <th className="text-right p-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {missingInfo.undocumented.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="p-3 font-mono text-sm">
                        <Link to={`/namespaces/${item.id}`} className="hover:text-primary">
                          {item.name}
                        </Link>
                      </td>
                      <td className="p-3">{item.cluster?.name || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                          Doküman Yok
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link to={`/documents?namespace_id=${item.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="h-3 w-3 mr-1" />
                            Doküman Ekle
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Harika! Tüm namespace'ler dokümante edilmiş.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
