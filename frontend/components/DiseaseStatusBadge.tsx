/**
 * Disease Status Badge Component
 * Displays a color-coded badge for disease status
 */

'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DiseaseStatus } from '@/lib/api/diseases';

interface DiseaseStatusBadgeProps {
  status?: DiseaseStatus | null;
  statusCode?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Status code to color mapping
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  REMISSION: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  CURED: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  SUSPECTED: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  UNDER_TREATMENT: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  DEFAULT: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
};

// Status code to Japanese label mapping (fallback, will be replaced by translations)
const statusLabels: Record<string, string> = {
  ACTIVE: '活動期',
  REMISSION: '寛解期',
  CURED: '完治',
  SUSPECTED: '疑い',
  UNDER_TREATMENT: '治療中',
};

// Size classes
const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export function DiseaseStatusBadge({ status, statusCode, size = 'md' }: DiseaseStatusBadgeProps) {
  const t = useTranslations('diseaseStatusBadge');
  const locale = useLocale();
  
  // Determine the status code to use
  const code = status?.status_code || statusCode || 'DEFAULT';

  // Get color scheme for the status
  const colors = statusColors[code] || statusColors.DEFAULT;

  // Get label (prioritize translation if available)
  let label = statusLabels[code] || code;
  if (status?.translations && status.translations.length > 0) {
    // Try to find translation matching current locale
    const localeTranslation = status.translations.find(t => t.language_code === locale);
    if (localeTranslation) {
      label = localeTranslation.translated_name;
    } else {
      // Fallback to Japanese translation
      const jaTranslation = status.translations.find(t => t.language_code === 'ja');
      if (jaTranslation) {
        label = jaTranslation.translated_name;
      } else {
        // Fallback to first available translation
        label = status.translations[0].translated_name;
      }
    }
  } else {
    // If no translations available, use translation key
    try {
      label = t(`status.${code}`) || label;
    } catch {
      // If translation key doesn't exist, use fallback
      label = statusLabels[code] || code;
    }
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
      `}
    >
      {label}
    </span>
  );
}

/**
 * Severity Level Badge Component
 * Displays a color-coded badge for disease severity level (1-5)
 */

interface SeverityBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const severityColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  3: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  4: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  5: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
};

const severityLabels: Record<number, string> = {
  1: '軽度',
  2: 'やや軽度',
  3: '中程度',
  4: 'やや重度',
  5: '重度',
};

export function SeverityBadge({ level, size = 'md' }: SeverityBadgeProps) {
  const t = useTranslations('diseaseStatusBadge');
  
  // Ensure level is within valid range
  const validLevel = Math.max(1, Math.min(5, level));
  const colors = severityColors[validLevel];
  const label = t(`severity.${validLevel}`);

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
      `}
    >
      {label} ({t('levelPrefix')}{validLevel})
    </span>
  );
}
