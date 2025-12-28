'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Globe, ChevronDown } from 'lucide-react';
import { useTransition, useState, useRef, useEffect } from 'react';

/**
 * Language Switcher Component
 * Allows users to switch between supported languages (ja/en)
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('languageSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (newLocale: 'ja' | 'en') => {
    setIsOpen(false);
    
    // Mark that user has manually overridden locale preference
    localStorage.setItem('locale_override', 'true');
    
    startTransition(() => {
      // Navigate to the same page but with the new locale
      router.replace(pathname, { locale: newLocale });
    });
  };

  const getLanguageName = (lang: string) => {
    return t(`languages.${lang}`);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
        disabled={isPending}
        aria-label={t('ariaLabel')}
        aria-expanded={isOpen}
      >
        <Globe className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">{getLanguageName(locale)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <button
            onClick={() => handleLanguageChange('ja')}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
              locale === 'ja' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
            }`}
            disabled={isPending || locale === 'ja'}
          >
            <span>{t('languages.ja')}</span>
            {locale === 'ja' && <span className="text-xs">✓</span>}
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
              locale === 'en' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
            }`}
            disabled={isPending || locale === 'en'}
          >
            <span>{t('languages.en')}</span>
            {locale === 'en' && <span className="text-xs">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
