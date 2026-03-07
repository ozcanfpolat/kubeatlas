import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  FileText,
  Download,
  TrendingUp,
  ExternalLink,
  Server
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dashboardApi, clustersApi } from '@/api'
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

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-report'],
    queryFn: () => clustersApi.list({ page_size: 100 }),
  })

  const clusters = clustersData?.items || []

  // Helper to get cluster name
  const getClusterName = (item: any) => {
    if (item.cluster?.name) return item.cluster.name
    if (item.cluster?.display_name) return item.cluster.display_name
    if (item.cluster_id) {
      const cluster = clusters.find((c: any) => c.id === item.cluster_id)
      return cluster?.display_name || cluster?.name || '-'
    }
    return '-'
  }

  // Generate and download Excel report with ExcelJS
  const downloadReport = async () => {
    if (!stats) return
    
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'KubeAtlas'
    workbook.created = new Date()

    // ===== ÖZET SAYFASI =====
    const summarySheet = workbook.addWorksheet('Özet', {
      properties: { tabColor: { argb: '3B82F6' } }
    })

    // Başlık
    summarySheet.mergeCells('A1:D1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = '🚀 KubeAtlas Envanter Raporu'
    titleCell.font = { size: 24, bold: true, color: { argb: '1E3A8A' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(1).height = 40

    // Tarih
    summarySheet.mergeCells('A2:D2')
    const dateCell = summarySheet.getCell('A2')
    dateCell.value = `Oluşturulma: ${new Date().toLocaleDateString('tr-TR', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`
    dateCell.font = { size: 11, italic: true, color: { argb: '6B7280' } }
    dateCell.alignment = { horizontal: 'center' }

    // Boş satır
    summarySheet.addRow([])

    // İstatistikler başlığı
    summarySheet.mergeCells('A4:D4')
    const statsHeader = summarySheet.getCell('A4')
    statsHeader.value = '📊 GENEL İSTATİSTİKLER'
    statsHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } }
    statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } }
    statsHeader.alignment = { horizontal: 'center' }
    summarySheet.getRow(4).height = 28

    // Tablo başlığı
    const headerRow = summarySheet.addRow(['Metrik', 'Değer', 'Yüzde', 'Durum'])
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Veri satırları
    const total = stats.total_namespaces || 0
    const withOwner = stats.namespaces_with_owner || 0
    const documented = stats.namespaces_documented || 0
    const withDeps = stats.namespaces_with_dependencies || 0

    const statsData = [
      ['Toplam Namespace', total, '100%', '✅'],
      ['Sahipli Namespace', withOwner, total ? `${Math.round((withOwner / total) * 100)}%` : '0%', withOwner === total ? '✅' : '⚠️'],
      ['Dokümanlı Namespace', documented, total ? `${Math.round((documented / total) * 100)}%` : '0%', documented === total ? '✅' : 'ℹ️'],
      ['Bağımlılık Tanımlı', withDeps, total ? `${Math.round((withDeps / total) * 100)}%` : '0%', withDeps > 0 ? '✅' : 'ℹ️'],
    ]

    statsData.forEach((row, idx) => {
      const dataRow = summarySheet.addRow(row)
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center' }
        // Alternatif satır rengi
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } }
        }
      })
    })

    // Boş satır
    summarySheet.addRow([])
    summarySheet.addRow([])

    // Eksiklik Analizi
    summarySheet.mergeCells(`A${summarySheet.rowCount + 1}:D${summarySheet.rowCount + 1}`)
    const missingHeader = summarySheet.getCell(`A${summarySheet.rowCount}`)
    missingHeader.value = '⚠️ EKSİKLİK ANALİZİ'
    missingHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } }
    missingHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } }
    missingHeader.alignment = { horizontal: 'center' }
    summarySheet.getRow(summarySheet.rowCount).height = 28

    const missingHeaderRow = summarySheet.addRow(['Durum', 'Sayı', 'Öncelik', 'Aksiyon'])
    missingHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    const orphanedCount = total - withOwner
    const undocCount = total - documented

    const missingData = [
      ['Sahipsiz Namespace', orphanedCount, orphanedCount > 0 ? '🔴 Yüksek' : '🟢 Yok', orphanedCount > 0 ? 'Sahip ataması yapın' : 'Aksiyon gerekmiyor'],
      ['Dokümansız Namespace', undocCount, undocCount > 10 ? '🟡 Orta' : '🟢 Düşük', undocCount > 0 ? 'Döküman ekleyin' : 'Aksiyon gerekmiyor'],
    ]

    missingData.forEach((row, idx) => {
      const dataRow = summarySheet.addRow(row)
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center' }
        // Renklendirme
        if (idx === 0 && orphanedCount > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } }
        } else if (idx === 1 && undocCount > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } }
        }
      })
    })

    // Sütun genişlikleri
    summarySheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 25 },
    ]

    // ===== SAHİPSİZ NAMESPACE SAYFASI =====
    const orphanedSheet = workbook.addWorksheet('Sahipsiz Namespace', {
      properties: { tabColor: { argb: 'EF4444' } }
    })

    // Başlık
    orphanedSheet.mergeCells('A1:C1')
    const orphanedTitle = orphanedSheet.getCell('A1')
    orphanedTitle.value = '🚨 Sahipsiz Namespace Listesi'
    orphanedTitle.font = { size: 18, bold: true, color: { argb: 'DC2626' } }
    orphanedTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    orphanedSheet.getRow(1).height = 35

    orphanedSheet.addRow([])

    // Tablo başlığı
    const orphanedHeaderRow = orphanedSheet.addRow(['#', 'Namespace Adı', 'Cluster'])
    orphanedHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DC2626' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Veriler
    const orphanedItems = missingInfo?.orphaned || []
    orphanedItems.forEach((item: any, idx: number) => {
      const row = orphanedSheet.addRow([idx + 1, item.name, getClusterName(item)])
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: colNumber === 1 ? 'center' : 'left' }
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } }
        }
      })
    })

    if (orphanedItems.length === 0) {
      orphanedSheet.addRow(['', '✅ Tüm namespace\'ler sahipli!', ''])
      orphanedSheet.getCell(`B${orphanedSheet.rowCount}`).font = { color: { argb: '16A34A' }, bold: true }
    }

    orphanedSheet.columns = [
      { width: 8 },
      { width: 45 },
      { width: 30 },
    ]

    // ===== DOKÜMANSIZ NAMESPACE SAYFASI =====
    const undocSheet = workbook.addWorksheet('Dokümansız Namespace', {
      properties: { tabColor: { argb: 'F59E0B' } }
    })

    // Başlık
    undocSheet.mergeCells('A1:C1')
    const undocTitle = undocSheet.getCell('A1')
    undocTitle.value = '📄 Dokümansız Namespace Listesi'
    undocTitle.font = { size: 18, bold: true, color: { argb: 'D97706' } }
    undocTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    undocSheet.getRow(1).height = 35

    undocSheet.addRow([])

    // Tablo başlığı
    const undocHeaderRow = undocSheet.addRow(['#', 'Namespace Adı', 'Cluster'])
    undocHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Veriler
    const undocItems = missingInfo?.undocumented || []
    undocItems.forEach((item: any, idx: number) => {
      const row = undocSheet.addRow([idx + 1, item.name, getClusterName(item)])
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: colNumber === 1 ? 'center' : 'left' }
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } }
        }
      })
    })

    if (undocItems.length === 0) {
      undocSheet.addRow(['', '✅ Tüm namespace\'ler dokümante edilmiş!', ''])
      undocSheet.getCell(`B${undocSheet.rowCount}`).font = { color: { argb: '16A34A' }, bold: true }
    }

    undocSheet.columns = [
      { width: 8 },
      { width: 45 },
      { width: 30 },
    ]

    // Download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kubeatlas-rapor-${new Date().toISOString().split('T')[0]}.xlsx`
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
                    <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">
                        <Link to={`/namespaces/${item.id}`} className="hover:text-primary">
                          {item.name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          {getClusterName(item)}
                        </div>
                      </td>
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
                    <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">
                        <Link to={`/namespaces/${item.id}`} className="hover:text-primary">
                          {item.name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          {getClusterName(item)}
                        </div>
                      </td>
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
