import { useState } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Key,
  Save,
  Globe,
  Check
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
import { useI18n } from '@/i18n'

export default function Settings() {
  const { user } = useAuthStore()
  const { language, setLanguage, t } = useI18n()
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  
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

  const handleLanguageChange = async (lang: 'tr' | 'en') => {
    setIsSaving(true)
    await setLanguage(lang)
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

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
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            {t('settings.profile')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Globe className="h-4 w-4" />
            {t('settings.preferences')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {t('settings.notifications')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            {language === 'tr' ? 'Görünüm' : 'Appearance'}
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
                  <Badge variant="outline" className="mt-2 capitalize">
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

        {/* Preferences Tab - Language Selection */}
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

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Görünüm' : 'Appearance'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Uygulama görünümünü özelleştirin' : 'Customize the application appearance'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>{language === 'tr' ? 'Tema' : 'Theme'}</Label>
                <Select defaultValue="dark">
                  <SelectTrigger className="w-[200px] mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('settings.light')}</SelectItem>
                    <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                    <SelectItem value="system">{t('settings.system')}</SelectItem>
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
              <CardTitle>{language === 'tr' ? 'Güvenlik' : 'Security'}</CardTitle>
              <CardDescription>
                {language === 'tr' ? 'Hesap güvenlik ayarlarınızı yönetin' : 'Manage your account security settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current_password">{language === 'tr' ? 'Mevcut Şifre' : 'Current Password'}</Label>
                  <Input
                    id="current_password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">{language === 'tr' ? 'Yeni Şifre' : 'New Password'}</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">{language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="••••••••"
                  />
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
                  https://api.kubeatlas.io/api/v1
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
    </div>
  )
}
