import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import trTranslations from './tr.json'
import enTranslations from './en.json'

type Language = 'tr' | 'en'

interface Translations {
  [key: string]: string | Translations
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string, params?: Record<string, string | number>) => string
  isLoading: boolean
}

const translations: Record<Language, Translations> = {
  tr: trTranslations,
  en: enTranslations,
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Helper to get nested value from object using dot notation
const getNestedValue = (obj: Translations, path: string): string | undefined => {
  const keys = path.split('.')
  let current: Translations | string = obj
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = current[key] as Translations | string
  }
  
  return typeof current === 'string' ? current : undefined
}

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('tr')
  const [isLoading, setIsLoading] = useState(true)

  // Load user's language preference on mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        // First check localStorage for quick initial load
        const cachedLang = localStorage.getItem('kubeatlas_language') as Language
        if (cachedLang && (cachedLang === 'tr' || cachedLang === 'en')) {
          setLanguageState(cachedLang)
        }

        // Then try to fetch from API
        const token = localStorage.getItem('token')
        if (token) {
          const response = await fetch('/api/v1/users/me/preferences', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            if (data.language && (data.language === 'tr' || data.language === 'en')) {
              setLanguageState(data.language)
              localStorage.setItem('kubeatlas_language', data.language)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load language preference:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLanguagePreference()
  }, [])

  // Set language and save to API
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('kubeatlas_language', lang)

    // Save to API
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await fetch('/api/v1/users/me/preferences', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: lang }),
        })
      }
    } catch (error) {
      console.error('Failed to save language preference:', error)
    }
  }, [])

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[language], key)
    
    if (!value) {
      // Fallback to English, then to key itself
      const fallback = getNestedValue(translations.en, key)
      if (!fallback) {
        console.warn(`Translation missing for key: ${key}`)
        return key
      }
      return fallback
    }

    // Replace parameters like {name} with actual values
    if (params) {
      return Object.entries(params).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`{${key}}`, 'g'), String(val))
      }, value)
    }

    return value
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Hook for just the translation function (shorter syntax)
export function useTranslation() {
  const { t, language } = useI18n()
  return { t, language }
}
