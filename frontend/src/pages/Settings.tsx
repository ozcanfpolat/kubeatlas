import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Key,
  Save,
  Globe,
  Check,
  Users,
  Plus,
  Trash2,
  Edit,
  Sun,
  Moon,
  Monitor,
  Server,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/store/authStore'
import { useI18n } from '@/i18n'
import { useTheme } from '@/lib/ThemeProvider'
import { usersApi } from '@/api'

interface CreateUserForm {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'editor' | 'viewer'
}

interface LDAPConfig {
  enabled: boolean
  server_url: string
  bind_dn: string
  bind_password: string
  search_base: string
  search_filter: string
  username_attribute: string
  email_attribute: string
  fullname_attribute: string
  group_search_base: string
  admin_group: string
  editor_group: string
  viewer_group: string
}

const roleDescriptions = {
  admin: {
    tr: 'Tüm işlemleri yapabilir (görüntüleme, düzenleme, silme, kullanıcı yönetimi)',
    en: 'Can perform all operations (view, edit, delete, user management)',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  editor: {
    tr: 'Görüntüleme ve düzenleme yapabilir, silme yapamaz',
    en: 'Can view and edit, cannot delete',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  viewer: {
    tr: 'Sadece görüntüleme yapabilir',
    en: 'Can only view',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
}

export default function Settings() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { language, setLanguage, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
  })

  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    slack_enabled: false,
    slack_webhook: '',
  })

  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'viewer',
  })

  const [ldapConfig, setLdapConfig] = useState<LDAPConfig>({
    enabled: false,
    server_url: '',
    bind_dn: '',
    bind_password: '',
    search_base: '',
    search_filter: '(uid={username})',
    username_attribute: 'uid',
    email_attribute: 'mail',
    fullname_attribute: 'cn',
    group_search_base: '',
    admin_group: 'kubeatlas-admins',
    editor_group: 'kubeatlas-editors',
    viewer_group: 'kubeatlas-viewers',
  })

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
    enabled: user?.role === 'admin',
  })

  const users = usersData?.items || []

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserForm) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateUserOpen(false)
      setCreateUserForm({ email: '', password: '', full_name: '', role: 'viewer' })
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserForm> }) => 
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteUserId(null)
    },
  })

  const handleLanguageChange = async (lang: 'tr' | 'en') => {
    setIsSaving(true)
    await setLanguage(lang)
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleSaveProfile = () => {
    console.log('Saving profile:', profileData)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleSaveNotifications = () => {
    console.log('Saving notifications:', notificationSettings)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleSaveLDAP = () => {
    console.log('Saving LDAP config:', ldapConfig)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            {t('settings.profile')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Globe className="h-4 w-4" />
            {t('settings.preferences')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            {language === 'tr' ? 'Görünüm' : 'Appearance'}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              {language === 'tr' ? 'Kullanıcılar' : 'Users'}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="ldap" className="gap-2">
              <Server className="h-4 w-4" />
              LDAP
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {language === 'tr' ? 'Bildirimler' : 'Notifications'}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            {language === 'tr' ? 'Güvenlik' : 'Security'}
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Profil Bilgileri' : 'Profile Information'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Kişisel bilgilerinizi güncelleyin' : 'Update your personal information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{user?.full_name || user?.email}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge 
                    variant="outline" 
                    className={`mt-2 capitalize ${roleDescriptions[user?.role as keyof typeof roleDescriptions]?.color || ''}`}
                  >
                    {user?.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">{language === 'tr' ? 'Ad Soyad' : 'Full Name'}</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder={language === 'tr' ? 'Ad Soyad' : 'Full Name'}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{language === 'tr' ? 'E-posta' : 'Email'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{language === 'tr' ? 'Telefon' : 'Phone'}</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+90 555 123 4567"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.preferences')}</CardTitle>
              <CardDescription>
                {t('settings.languageDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('settings.language')}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('settings.languageDesc')}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button
                      onClick={() => handleLanguageChange('tr')}
                      disabled={isSaving}
                      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                        language === 'tr' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇹🇷</span>
                        <div>
                          <p className="font-medium">Türkçe</p>
                          <p className="text-sm text-muted-foreground">Turkish</p>
                        </div>
                      </div>
                      {language === 'tr' && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => handleLanguageChange('en')}
                      disabled={isSaving}
                      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                        language === 'en' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇬🇧</span>
                        <div>
                          <p className="font-medium">English</p>
                          <p className="text-sm text-muted-foreground">İngilizce</p>
                        </div>
                      </div>
                      {language === 'en' && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>
                  </div>

                  {showSaved && (
                    <div className="mt-4 flex items-center gap-2 text-green-500">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">{t('settings.saved')}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Görünüm' : 'Appearance'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Uygulama temasını özelleştirin' : 'Customize the application theme'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {language === 'tr' ? 'Tema' : 'Theme'}
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {language === 'tr' ? 'Arayüz temasını seçin' : 'Select the interface theme'}
                </p>
                
                <div className="grid grid-cols-3 gap-4 max-w-lg">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      theme === 'light' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-yellow-600" />
                      </div>
                      <p className="font-medium">{t('settings.light')}</p>
                    </div>
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      theme === 'dark' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <Moon className="h-6 w-6 text-slate-200" />
                      </div>
                      <p className="font-medium">{t('settings.dark')}</p>
                    </div>
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      theme === 'system' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-100 to-slate-800 flex items-center justify-center">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-medium">{t('settings.system')}</p>
                    </div>
                    {theme === 'system' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {language === 'tr' ? 'Kullanıcı Yönetimi' : 'User Management'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'tr' ? 'Kullanıcıları oluşturun, düzenleyin ve yönetin' : 'Create, edit and manage users'}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateUserOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'tr' ? 'Kullanıcı Ekle' : 'Add User'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Role Legend */}
                <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-3">{language === 'tr' ? 'Rol Açıklamaları' : 'Role Descriptions'}</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {Object.entries(roleDescriptions).map(([role, desc]) => (
                      <div key={role} className={`p-3 rounded-lg ${desc.bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`capitalize ${desc.color}`}>{role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'tr' ? desc.tr : desc.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users Table */}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'tr' ? 'Kullanıcı' : 'User'}</TableHead>
                        <TableHead>E-posta</TableHead>
                        <TableHead>{language === 'tr' ? 'Rol' : 'Role'}</TableHead>
                        <TableHead>{language === 'tr' ? 'Durum' : 'Status'}</TableHead>
                        <TableHead className="text-right">{language === 'tr' ? 'İşlemler' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{u.full_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`capitalize ${roleDescriptions[u.role as keyof typeof roleDescriptions]?.color || ''}`}
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.is_active ? 'default' : 'secondary'}>
                              {u.is_active 
                                ? (language === 'tr' ? 'Aktif' : 'Active')
                                : (language === 'tr' ? 'Pasif' : 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingUser(u)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {u.id !== user?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeleteUserId(u.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* LDAP Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="ldap">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  LDAP / Active Directory
                </CardTitle>
                <CardDescription>
                  {language === 'tr' 
                    ? 'LDAP veya Active Directory ile kullanıcı doğrulaması yapılandırın' 
                    : 'Configure user authentication with LDAP or Active Directory'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${ldapConfig.enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                      <Lock className={`h-6 w-6 ${ldapConfig.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{language === 'tr' ? 'LDAP Kimlik Doğrulama' : 'LDAP Authentication'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {ldapConfig.enabled 
                          ? (language === 'tr' ? 'LDAP kimlik doğrulaması aktif' : 'LDAP authentication is enabled')
                          : (language === 'tr' ? 'LDAP kimlik doğrulaması pasif' : 'LDAP authentication is disabled')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={ldapConfig.enabled ? 'default' : 'outline'}
                    onClick={() => setLdapConfig({ ...ldapConfig, enabled: !ldapConfig.enabled })}
                  >
                    {ldapConfig.enabled 
                      ? (language === 'tr' ? 'Aktif' : 'Enabled')
                      : (language === 'tr' ? 'Pasif' : 'Disabled')}
                  </Button>
                </div>

                {ldapConfig.enabled && (
                  <>
                    <Separator />
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>LDAP Server URL</Label>
                        <Input
                          placeholder="ldaps://ldap.example.com:636"
                          value={ldapConfig.server_url}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, server_url: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bind DN</Label>
                        <Input
                          placeholder="cn=admin,dc=example,dc=com"
                          value={ldapConfig.bind_dn}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, bind_dn: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bind Password</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={ldapConfig.bind_password}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, bind_password: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Search Base</Label>
                        <Input
                          placeholder="ou=users,dc=example,dc=com"
                          value={ldapConfig.search_base}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, search_base: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Search Filter</Label>
                        <Input
                          placeholder="(uid={username})"
                          value={ldapConfig.search_filter}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, search_filter: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Username Attribute</Label>
                        <Input
                          placeholder="uid"
                          value={ldapConfig.username_attribute}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, username_attribute: e.target.value })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">{language === 'tr' ? 'Grup Eşleştirme' : 'Group Mapping'}</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Group Search Base</Label>
                          <Input
                            placeholder="ou=groups,dc=example,dc=com"
                            value={ldapConfig.group_search_base}
                            onChange={(e) => setLdapConfig({ ...ldapConfig, group_search_base: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Group</Label>
                          <Input
                            placeholder="kubeatlas-admins"
                            value={ldapConfig.admin_group}
                            onChange={(e) => setLdapConfig({ ...ldapConfig, admin_group: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Editor Group</Label>
                          <Input
                            placeholder="kubeatlas-editors"
                            value={ldapConfig.editor_group}
                            onChange={(e) => setLdapConfig({ ...ldapConfig, editor_group: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Viewer Group</Label>
                          <Input
                            placeholder="kubeatlas-viewers"
                            value={ldapConfig.viewer_group}
                            onChange={(e) => setLdapConfig({ ...ldapConfig, viewer_group: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline">
                        {language === 'tr' ? 'Bağlantıyı Test Et' : 'Test Connection'}
                      </Button>
                      <Button onClick={handleSaveLDAP}>
                        <Save className="h-4 w-4 mr-2" />
                        {t('common.save')}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Bildirim Ayarları' : 'Notification Settings'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Bildirim tercihlerinizi yapılandırın' : 'Configure your notification preferences'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium">{language === 'tr' ? 'E-posta Bildirimleri' : 'Email Notifications'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Önemli güncellemeler için e-posta alın' : 'Receive emails for important updates'}
                    </p>
                  </div>
                  <Button 
                    variant={notificationSettings.email_enabled ? 'default' : 'outline'}
                    onClick={() => setNotificationSettings({ 
                      ...notificationSettings, 
                      email_enabled: !notificationSettings.email_enabled 
                    })}
                  >
                    {notificationSettings.email_enabled 
                      ? (language === 'tr' ? 'Aktif' : 'Active') 
                      : (language === 'tr' ? 'Pasif' : 'Inactive')}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium">{language === 'tr' ? 'Slack Bildirimleri' : 'Slack Notifications'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Slack kanalına bildirim gönderin' : 'Send notifications to Slack channel'}
                    </p>
                  </div>
                  <Button 
                    variant={notificationSettings.slack_enabled ? 'default' : 'outline'}
                    onClick={() => setNotificationSettings({ 
                      ...notificationSettings, 
                      slack_enabled: !notificationSettings.slack_enabled 
                    })}
                  >
                    {notificationSettings.slack_enabled 
                      ? (language === 'tr' ? 'Aktif' : 'Active') 
                      : (language === 'tr' ? 'Pasif' : 'Inactive')}
                  </Button>
                </div>

                {notificationSettings.slack_enabled && (
                  <div>
                    <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                    <Input
                      id="slack_webhook"
                      value={notificationSettings.slack_webhook}
                      onChange={(e) => setNotificationSettings({ 
                        ...notificationSettings, 
                        slack_webhook: e.target.value 
                      })}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Güvenlik' : 'Security'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Hesap güvenlik ayarlarınızı yönetin' : 'Manage your account security settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current_password">{language === 'tr' ? 'Mevcut Şifre' : 'Current Password'}</Label>
                  <Input id="current_password" type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label htmlFor="new_password">{language === 'tr' ? 'Yeni Şifre' : 'New Password'}</Label>
                  <Input id="new_password" type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label htmlFor="confirm_password">{language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}</Label>
                  <Input id="confirm_password" type="password" placeholder="••••••••" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>{language === 'tr' ? 'Şifreyi Değiştir' : 'Change Password'}</Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">{language === 'tr' ? 'İki Faktörlü Doğrulama' : 'Two-Factor Authentication'}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === 'tr' ? 'Hesabınıza ekstra güvenlik katmanı ekleyin' : 'Add an extra layer of security to your account'}
                </p>
                <Button variant="outline">{language === 'tr' ? '2FA\'yı Etkinleştir' : 'Enable 2FA'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'API Erişimi' : 'API Access'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'API anahtarlarınızı yönetin' : 'Manage your API keys'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">API Endpoint</h4>
                  <Badge>v1</Badge>
                </div>
                <code className="text-sm text-muted-foreground">
                  {window.location.origin}/api/v1
                </code>
              </div>

              <div>
                <h4 className="font-medium mb-4">{language === 'tr' ? 'API Anahtarları' : 'API Keys'}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Production Key</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'tr' ? 'Oluşturulma: 15 Ocak 2024' : 'Created: Jan 15, 2024'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">{language === 'tr' ? 'Göster' : 'Show'}</Button>
                      <Button variant="outline" size="sm" className="text-red-500">
                        {language === 'tr' ? 'İptal Et' : 'Revoke'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button>
                <Key className="h-4 w-4 mr-2" />
                {language === 'tr' ? 'Yeni API Anahtarı' : 'New API Key'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {language === 'tr' ? 'Yeni Kullanıcı Oluştur' : 'Create New User'}
            </DialogTitle>
            <DialogDescription>
              {language === 'tr' ? 'Local kullanıcı hesabı oluşturun' : 'Create a local user account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-posta *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'tr' ? 'Ad Soyad' : 'Full Name'}</Label>
              <Input
                placeholder={language === 'tr' ? 'Ad Soyad' : 'Full Name'}
                value={createUserForm.full_name}
                onChange={(e) => setCreateUserForm({ ...createUserForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'tr' ? 'Şifre' : 'Password'} *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={createUserForm.password}
                onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'tr' ? 'Rol' : 'Role'}</Label>
              <Select
                value={createUserForm.role}
                onValueChange={(v: 'admin' | 'editor' | 'viewer') => setCreateUserForm({ ...createUserForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-500">viewer</Badge>
                      <span className="text-sm text-muted-foreground">
                        {language === 'tr' ? 'Sadece görüntüleme' : 'View only'}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-500">editor</Badge>
                      <span className="text-sm text-muted-foreground">
                        {language === 'tr' ? 'Görüntüleme + düzenleme' : 'View + edit'}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-red-500">admin</Badge>
                      <span className="text-sm text-muted-foreground">
                        {language === 'tr' ? 'Tüm yetkiler' : 'Full access'}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => createUserMutation.mutate(createUserForm)}
              disabled={!createUserForm.email || !createUserForm.password || createUserMutation.isPending}
            >
              {createUserMutation.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {language === 'tr' ? 'Kullanıcıyı Düzenle' : 'Edit User'}
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input value={editingUser.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'tr' ? 'Ad Soyad' : 'Full Name'}</Label>
                <Input
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'tr' ? 'Rol' : 'Role'}</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">viewer</SelectItem>
                    <SelectItem value="editor">editor</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => updateUserMutation.mutate({ 
                id: editingUser.id, 
                data: { full_name: editingUser.full_name, role: editingUser.role }
              })}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {language === 'tr' ? 'Kullanıcıyı Sil' : 'Delete User'}
            </DialogTitle>
            <DialogDescription>
              {language === 'tr' 
                ? 'Bu işlem geri alınamaz. Kullanıcı kalıcı olarak silinecektir.'
                : 'This action cannot be undone. The user will be permanently deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
