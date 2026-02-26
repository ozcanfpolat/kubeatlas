import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { documentsApi, namespacesApi } from '@/api'
import { formatFileSize, formatRelativeTime } from '@/lib/utils'

function getFileIcon(mimeType: string) {
  if (mimeType.includes('image')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('json') || mimeType.includes('xml')) return FileCode
  return File
}

export default function Documents() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    namespace_id: '',
    category_id: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(100),
  })

  const { data: categories } = useQuery({
    queryKey: ['document-categories'],
    queryFn: documentsApi.getCategories,
  })

  const { data: namespacesData } = useQuery({
    queryKey: ['namespaces-select'],
    queryFn: () => namespacesApi.list({ page: 1, page_size: 100 }),
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected')
      return documentsApi.upload(selectedFile, {
        name: uploadData.name || selectedFile.name,
        description: uploadData.description,
        namespace_id: uploadData.namespace_id || undefined,
        category_id: uploadData.category_id || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setIsUploadOpen(false)
      setSelectedFile(null)
      setUploadData({ name: '', description: '', namespace_id: '', category_id: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadData({ ...uploadData, name: file.name })
    }
  }

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    uploadMutation.mutate()
  }

  const filteredDocs = documents?.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.file_name.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dokümanlar</h1>
          <p className="text-muted-foreground mt-1">
            Runbook, mimari diagram ve diğer dokümanları yönetin
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Doküman Yükle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Doküman Yükle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              {/* File Input */}
              <div>
                <Label>Dosya</Label>
                <div 
                  className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Dosya seçmek için tıklayın
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg"
                />
              </div>

              <div>
                <Label htmlFor="doc-name">Doküman Adı</Label>
                <Input
                  id="doc-name"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  placeholder="Runbook - Payment Service"
                />
              </div>

              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Servis için operasyonel rehber"
                />
              </div>

              <div>
                <Label>Namespace (Opsiyonel)</Label>
                <Select
                  value={uploadData.namespace_id}
                  onValueChange={(value) => setUploadData({ ...uploadData, namespace_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Namespace seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Genel</SelectItem>
                    {namespacesData?.data?.map((ns) => (
                      <SelectItem key={ns.id} value={ns.id}>
                        {ns.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kategori</Label>
                <Select
                  value={uploadData.category_id}
                  onValueChange={(value) => setUploadData({ ...uploadData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsUploadOpen(false)
                    setSelectedFile(null)
                  }}
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Yükleniyor...' : 'Yükle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Doküman ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium">Doküman</th>
                  <th className="text-left p-4 font-medium">Kategori</th>
                  <th className="text-left p-4 font-medium">Namespace</th>
                  <th className="text-left p-4 font-medium">Boyut</th>
                  <th className="text-left p-4 font-medium">Yükleyen</th>
                  <th className="text-left p-4 font-medium">Tarih</th>
                  <th className="text-right p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs?.map((doc) => {
                  const FileIcon = getFileIcon(doc.mime_type)
                  return (
                    <tr key={doc.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {doc.category ? (
                          <Badge variant="outline">{doc.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {doc.namespace ? (
                          <span className="font-mono text-sm">{doc.namespace.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Genel</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="p-4 text-sm">
                        {doc.uploaded_by_user?.full_name || 'Bilinmiyor'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatRelativeTime(doc.uploaded_at)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a 
                            href={documentsApi.getDownloadUrl(doc.id)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) {
                                deleteMutation.mutate(doc.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!filteredDocs || filteredDocs.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Henüz doküman yok</h3>
                      <p className="text-muted-foreground mb-4">
                        İlk dokümanınızı yükleyerek başlayın
                      </p>
                      <Button onClick={() => setIsUploadOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Doküman Yükle
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
