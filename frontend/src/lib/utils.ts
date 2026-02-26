import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: tr })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: tr })
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    error: 'bg-red-500',
    syncing: 'bg-blue-500',
    pending: 'bg-yellow-500',
    warning: 'bg-orange-500',
  }
  return colors[status] || 'bg-gray-500'
}

export function getCriticalityColor(criticality: string): string {
  const colors: Record<string, string> = {
    'tier-1': 'bg-red-500 text-white',
    'tier-2': 'bg-orange-500 text-white',
    'tier-3': 'bg-blue-500 text-white',
  }
  return colors[criticality] || 'bg-gray-500 text-white'
}

export function getEnvironmentColor(environment: string): string {
  const colors: Record<string, string> = {
    production: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    staging: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    development: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    test: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }
  return colors[environment] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getClusterTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    kubernetes: "☸️",
    docker: "🐳",
    openshift: "🟥",
    rancher: "🐮",
  }

  return icons[type] || "🖥️"
}