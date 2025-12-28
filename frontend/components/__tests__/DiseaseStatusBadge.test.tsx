/**
 * Tests for DiseaseStatusBadge component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiseaseStatusBadge } from '../DiseaseStatusBadge';
import { DiseaseStatus } from '@/lib/api/diseases';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const translations: Record<string, string> = {
      'status.ACTIVE': '活動期',
      'status.REMISSION': '寛解期',
      'status.CURED': '完治',
      'status.SUSPECTED': '疑い',
      'status.UNDER_TREATMENT': '治療中',
    };
    return translations[key] || key;
  },
  useLocale: () => 'ja',
}));

describe('DiseaseStatusBadge', () => {
  const mockStatus: DiseaseStatus = {
    id: 1,
    status_code: 'ACTIVE',
    display_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    translations: [],
  };

  it('should render status badge with status object', () => {
    render(<DiseaseStatusBadge status={mockStatus} />);
    expect(screen.getByText('活動期')).toBeInTheDocument();
  });

  it('should render status badge with statusCode', () => {
    render(<DiseaseStatusBadge statusCode="REMISSION" />);
    expect(screen.getByText('寛解期')).toBeInTheDocument();
  });

  it('should render default status when no status provided', () => {
    render(<DiseaseStatusBadge />);
    // Should render something (default status)
    expect(screen.getByText(/DEFAULT/i)).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { container, rerender } = render(
      <DiseaseStatusBadge status={mockStatus} size="sm" />
    );
    expect(container.firstChild).toHaveClass('text-xs');

    rerender(<DiseaseStatusBadge status={mockStatus} size="md" />);
    expect(container.firstChild).toHaveClass('text-sm');

    rerender(<DiseaseStatusBadge status={mockStatus} size="lg" />);
    expect(container.firstChild).toHaveClass('text-base');
  });

  it('should apply correct color classes for ACTIVE status', () => {
    const { container } = render(
      <DiseaseStatusBadge statusCode="ACTIVE" />
    );
    expect(container.firstChild).toHaveClass('bg-red-100');
    expect(container.firstChild).toHaveClass('text-red-800');
  });

  it('should apply correct color classes for REMISSION status', () => {
    const { container } = render(
      <DiseaseStatusBadge statusCode="REMISSION" />
    );
    expect(container.firstChild).toHaveClass('bg-green-100');
    expect(container.firstChild).toHaveClass('text-green-800');
  });

  it('should apply correct color classes for CURED status', () => {
    const { container } = render(
      <DiseaseStatusBadge statusCode="CURED" />
    );
    expect(container.firstChild).toHaveClass('bg-blue-100');
    expect(container.firstChild).toHaveClass('text-blue-800');
  });

  it('should apply correct color classes for SUSPECTED status', () => {
    const { container } = render(
      <DiseaseStatusBadge statusCode="SUSPECTED" />
    );
    expect(container.firstChild).toHaveClass('bg-yellow-100');
    expect(container.firstChild).toHaveClass('text-yellow-800');
  });

  it('should apply correct color classes for UNDER_TREATMENT status', () => {
    const { container } = render(
      <DiseaseStatusBadge statusCode="UNDER_TREATMENT" />
    );
    expect(container.firstChild).toHaveClass('bg-purple-100');
    expect(container.firstChild).toHaveClass('text-purple-800');
  });

  it('should prioritize status.status_code over statusCode prop', () => {
    const statusWithCode: DiseaseStatus = {
      ...mockStatus,
      status_code: 'CURED',
    } as DiseaseStatus;
    render(
      <DiseaseStatusBadge status={statusWithCode} statusCode="ACTIVE" />
    );
    expect(screen.getByText('完治')).toBeInTheDocument();
  });
});

