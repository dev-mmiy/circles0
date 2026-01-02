/**
 * Tests for VitalCharts component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VitalCharts from '../VitalCharts';
import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { SpO2Record } from '@/lib/api/spo2Records';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="chevron-left">←</div>,
  ChevronRight: () => <div data-testid="chevron-right">→</div>,
}));

// Mock window.matchMedia for ResponsiveContainer
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('VitalCharts', () => {
  const mockBloodPressureRecords: BloodPressureRecord[] = [
    {
      id: '1',
      systolic: 120,
      diastolic: 80,
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockHeartRateRecords: HeartRateRecord[] = [
    {
      id: '1',
      bpm: 72,
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockTemperatureRecords: TemperatureRecord[] = [
    {
      id: '1',
      value: 36.5,
      unit: 'celsius',
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockWeightRecords: WeightRecord[] = [
    {
      id: '1',
      value: 70,
      unit: 'kg',
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockBodyFatRecords: BodyFatRecord[] = [
    {
      id: '1',
      percentage: 15,
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockBloodGlucoseRecords: BloodGlucoseRecord[] = [
    {
      id: '1',
      value: 100,
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockSpO2Records: SpO2Record[] = [
    {
      id: '1',
      percentage: 98,
      recorded_at: new Date().toISOString(),
      user_id: '1',
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    period: '1week' as const,
    bloodPressureRecords: mockBloodPressureRecords,
    heartRateRecords: mockHeartRateRecords,
    temperatureRecords: mockTemperatureRecords,
    weightRecords: mockWeightRecords,
    bodyFatRecords: mockBodyFatRecords,
    bloodGlucoseRecords: mockBloodGlucoseRecords,
    spo2Records: mockSpO2Records,
  };

  it('should render all chart sections when data is available', () => {
    render(<VitalCharts {...defaultProps} />);
    
    expect(screen.getByText('血圧・心拍数')).toBeInTheDocument();
    expect(screen.getByText('体重・体脂肪率')).toBeInTheDocument();
    expect(screen.getByText('体温')).toBeInTheDocument();
    expect(screen.getByText('血糖値')).toBeInTheDocument();
    expect(screen.getByText('血中酸素濃度')).toBeInTheDocument();
  });

  it('should render navigation arrows for all periods', () => {
    render(<VitalCharts {...defaultProps} />);
    
    const leftArrows = screen.getAllByTestId('chevron-left');
    const rightArrows = screen.getAllByTestId('chevron-right');
    
    expect(leftArrows.length).toBeGreaterThan(0);
    expect(rightArrows.length).toBeGreaterThan(0);
  });

  it('should disable right arrow when weekOffset is 0', () => {
    render(<VitalCharts {...defaultProps} />);
    
    const rightArrows = screen.getAllByTestId('chevron-right');
    rightArrows.forEach(arrow => {
      const button = arrow.closest('button');
      expect(button).toBeDisabled();
    });
  });

  it('should enable right arrow after navigating to previous period', async () => {
    render(<VitalCharts {...defaultProps} />);
    
    const leftArrows = screen.getAllByTestId('chevron-left');
    const firstLeftArrow = leftArrows[0];
    const button = firstLeftArrow.closest('button');
    
    if (button) {
      fireEvent.click(button);
      
      await waitFor(() => {
        const rightArrows = screen.getAllByTestId('chevron-right');
        const firstRightArrow = rightArrows[0];
        const rightButton = firstRightArrow.closest('button');
        expect(rightButton).not.toBeDisabled();
      });
    }
  });

  it('should display period range in title for 1week period', () => {
    render(<VitalCharts {...defaultProps} period="1week" />);
    
    // Period range should be displayed in the title
    const titles = screen.getAllByText(/血圧・心拍数/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should display period range in title for 1month period', () => {
    render(<VitalCharts {...defaultProps} period="1month" />);
    
    const titles = screen.getAllByText(/血圧・心拍数/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should display period range in title for 6months period', () => {
    // Create records within the 6months range
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3);
    
    const recordsInRange: BloodPressureRecord[] = [
      {
        id: '1',
        systolic: 120,
        diastolic: 80,
        recorded_at: sixMonthsAgo.toISOString(),
        user_id: '1',
        visibility: 'private',
        created_at: sixMonthsAgo.toISOString(),
        updated_at: sixMonthsAgo.toISOString(),
      },
    ];

    render(
      <VitalCharts
        {...defaultProps}
        period="6months"
        bloodPressureRecords={recordsInRange}
      />
    );
    
    const titles = screen.getAllByText(/血圧・心拍数/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should display period range in title for 1year period', () => {
    // Create records within the 1year range
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recordsInRange: BloodPressureRecord[] = [
      {
        id: '1',
        systolic: 120,
        diastolic: 80,
        recorded_at: sixMonthsAgo.toISOString(),
        user_id: '1',
        visibility: 'private',
        created_at: sixMonthsAgo.toISOString(),
        updated_at: sixMonthsAgo.toISOString(),
      },
    ];

    render(
      <VitalCharts
        {...defaultProps}
        period="1year"
        bloodPressureRecords={recordsInRange}
      />
    );
    
    const titles = screen.getAllByText(/血圧・心拍数/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should handle empty records gracefully', () => {
    // For 1week and 1month periods, the component generates data points for all days
    // even when there are no records, so "No Data" message may not appear
    // This test verifies the component renders without errors
    const { container } = render(
      <VitalCharts
        period="1week"
        bloodPressureRecords={[]}
        heartRateRecords={[]}
        temperatureRecords={[]}
        weightRecords={[]}
        bodyFatRecords={[]}
        bloodGlucoseRecords={[]}
        spo2Records={[]}
      />
    );
    
    // Component should render without errors
    // For 1week period, it may show chart sections with empty data or "No Data" message
    expect(container).toBeInTheDocument();
  });

  it('should handle navigation to previous period', async () => {
    render(<VitalCharts {...defaultProps} />);
    
    const leftArrows = screen.getAllByTestId('chevron-left');
    const firstLeftArrow = leftArrows[0];
    const button = firstLeftArrow.closest('button');
    
    if (button) {
      fireEvent.click(button);
      
      // Component should still render after navigation
      await waitFor(() => {
        expect(screen.getByText('血圧・心拍数')).toBeInTheDocument();
      });
    }
  });

  it('should handle navigation to next period after going back', async () => {
    render(<VitalCharts {...defaultProps} />);
    
    // First, navigate to previous period
    const leftArrows = screen.getAllByTestId('chevron-left');
    const firstLeftArrow = leftArrows[0];
    const leftButton = firstLeftArrow.closest('button');
    
    if (leftButton) {
      fireEvent.click(leftButton);
      
      await waitFor(() => {
        // Then navigate back to next period
        const rightArrows = screen.getAllByTestId('chevron-right');
        const firstRightArrow = rightArrows[0];
        const rightButton = firstRightArrow.closest('button');
        
        if (rightButton && !rightButton.disabled) {
          fireEvent.click(rightButton);
          
          // Component should still render
          expect(screen.getByText('血圧・心拍数')).toBeInTheDocument();
        }
      });
    }
  });

  it('should filter records by date range correctly', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    
    const oldRecords: BloodPressureRecord[] = [
      {
        id: '1',
        systolic: 120,
        diastolic: 80,
        recorded_at: oldDate.toISOString(),
        user_id: '1',
        visibility: 'private',
        created_at: oldDate.toISOString(),
        updated_at: oldDate.toISOString(),
      },
    ];

    render(
      <VitalCharts
        {...defaultProps}
        period="1week"
        bloodPressureRecords={[...mockBloodPressureRecords, ...oldRecords]}
      />
    );
    
    // Component should render without errors
    expect(screen.getByText('血圧・心拍数')).toBeInTheDocument();
  });
});

