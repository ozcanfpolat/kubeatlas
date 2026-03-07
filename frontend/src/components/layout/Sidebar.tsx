import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  Boxes,
  Users,
  Building2,
  FileText,
  GitBranch,
  BarChart3,
  Settings,
  History,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'

export default function Sidebar() {
  const { t } = useTranslation()

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.clusters'), href: '/clusters', icon: Server },
    { name: t('nav.namespaces'), href: '/namespaces', icon: Boxes },
    { name: t('nav.teams'), href: '/teams', icon: Users },
    { name: t('nav.businessUnits'), href: '/business-units', icon: Building2 },
    { name: t('nav.dependencies'), href: '/dependencies', icon: GitBranch },
    { name: t('nav.documents'), href: '/documents', icon: FileText },
    { name: t('nav.reports'), href: '/reports', icon: BarChart3 },
    { name: t('nav.auditLogs'), href: '/audit', icon: History },
  ]

  const secondaryNavigation = [
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold">KubeAtlas</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t px-3 py-4">
        {secondaryNavigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </div>

      {/* Help */}
      <div className="border-t p-4">
        <a
          href="https://docs.kubeatlas.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Documentation</span>
        </a>
      </div>
    </div>
  )
}
