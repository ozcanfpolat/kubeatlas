import { describe, it, expect } from 'vitest'
import { formatDate, formatFileSize, getInitials, truncate, getCriticalityColor, getStatusColor, getEnvironmentColor } from '../utils'

describe('Utils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1572864)).toBe('1.5 MB')
    })
  })

  describe('getInitials', () => {
    it('should return initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Alice')).toBe('A')
      expect(getInitials('John Michael Doe')).toBe('JM')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...')
      expect(truncate('Hi', 5)).toBe('Hi')
      expect(truncate('Hello', 5)).toBe('Hello')
    })
  })

  describe('getCriticalityColor', () => {
    it('should return correct colors for criticality levels', () => {
      expect(getCriticalityColor('tier-1')).toContain('red')
      expect(getCriticalityColor('tier-2')).toContain('yellow')
      expect(getCriticalityColor('tier-3')).toContain('green')
      expect(getCriticalityColor('unknown')).toContain('gray')
    })
  })

  describe('getStatusColor', () => {
    it('should return correct colors for status', () => {
      expect(getStatusColor('active')).toContain('green')
      expect(getStatusColor('syncing')).toContain('blue')
      expect(getStatusColor('error')).toContain('red')
      expect(getStatusColor('pending')).toContain('yellow')
    })
  })

  describe('getEnvironmentColor', () => {
    it('should return correct colors for environments', () => {
      expect(getEnvironmentColor('production')).toContain('red')
      expect(getEnvironmentColor('staging')).toContain('yellow')
      expect(getEnvironmentColor('development')).toContain('blue')
      expect(getEnvironmentColor('test')).toContain('purple')
    })
  })
})
