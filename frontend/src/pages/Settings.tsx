import { useState } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Key,
  Globe,
  Save
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
import { useAuthStore } from '@/store/authStore'

export default function Settings() {
  const { user } = useAuthStore()
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

  const handleSaveProfile = () => {
    // TODO: Implement save profile
    console.log('Saving profile:', profileData)
  }

  const handleSaveNotifications = () => {
    // TODO: Implement save notifications
    console.log('Saving notifications:', notificationSettings)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">
          Hesap ve uygulama ayarlarını yönetin
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Bildirimler
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Görünüm
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Güvenlik
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
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>
                Kişisel bilgilerinizi güncelleyin
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
                  <Badge variant="outline" className="mt-2 capitalize">
                    {user?.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="Ad Soyad"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
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
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Ayarları</CardTitle>
              <CardDescription>
                Bildirim tercihlerinizi yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium">E-posta Bildirimleri</h4>
                    <p className="text-sm text-muted-foreground">
                      Önemli güncellemeler için e-posta alın
                    </p>
                  </div>
                  <Button 
                    variant={notificationSettings.email_enabled ? 'default' : 'outline'}
                    onClick={() => setNotificationSettings({ 
                      ...notificationSettings, 
                      email_enabled: !notificationSettings.email_enabled 
                    })}
                  >
                    {notificationSettings.email_enabled ? 'Aktif' : 'Pasif'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium">Slack Bildirimleri</h4>
                    <p className="text-sm text-muted-foreground">
                      Slack kanalına bildirim gönderin
                    </p>
                  </div>
                  <Button 
                    variant={notificationSettings.slack_enabled ? 'default' : 'outline'}
                    onClick={() => setNotificationSettings({ 
                      ...notificationSettings, 
                      slack_enabled: !notificationSettings.slack_enabled 
                    })}
                  >
                    {notificationSettings.slack_enabled ? 'Aktif' : 'Pasif'}
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
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Görünüm</CardTitle>
              <CardDescription>
                Uygulama görünümünü özelleştirin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Tema</Label>
                <Select defaultValue="dark">
                  <SelectTrigger className="w-[200px] mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Açık</SelectItem>
                    <SelectItem value="dark">Koyu</SelectItem>
                    <SelectItem value="system">Sistem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dil</Label>
                <Select defaultValue="tr">
                  <SelectTrigger className="w-[200px] mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Güvenlik</CardTitle>
              <CardDescription>
                Hesap güvenlik ayarlarınızı yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current_password">Mevcut Şifre</Label>
                  <Input
                    id="current_password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Yeni Şifre</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">Şifre Tekrar</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Şifreyi Değiştir</Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">İki Faktörlü Doğrulama</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Hesabınıza ekstra güvenlik katmanı ekleyin
                </p>
                <Button variant="outline">2FA'yı Etkinleştir</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Erişimi</CardTitle>
              <CardDescription>
                API anahtarlarınızı yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">API Endpoint</h4>
                  <Badge>v1</Badge>
                </div>
                <code className="text-sm text-muted-foreground">
                  https://api.kubeatlas.io/api/v1
                </code>
              </div>

              <div>
                <h4 className="font-medium mb-4">API Anahtarları</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Production Key</p>
                      <p className="text-sm text-muted-foreground">
                        Oluşturulma: 15 Ocak 2024
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Göster</Button>
                      <Button variant="outline" size="sm" className="text-red-500">
                        İptal Et
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button>
                <Key className="h-4 w-4 mr-2" />
                Yeni API Anahtarı
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
