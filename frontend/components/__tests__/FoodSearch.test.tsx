/**
 * Tests for FoodSearch component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FoodSearch from '../FoodSearch';
import type { Food, Menu } from '@/types/food';

const mockOnSelect = jest.fn();

let mockFoodsData: Food[] | undefined;
let mockMenusData: Menu[] | undefined;
let mockFoodsLoading: boolean;
let mockMenusLoading: boolean;
let mockFoodsError: boolean;
let mockMenusError: boolean;
let mockFoodsErrorObj: Error | null;
let mockMenusErrorObj: Error | null;

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    getAccessTokenSilently: jest.fn().mockResolvedValue('mock-token'),
  }),
}));

jest.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: unknown[]; enabled?: boolean }) => {
    const key = Array.isArray(opts.queryKey) ? opts.queryKey[0] : '';
    const enabled = opts.enabled ?? false;
    if (key === 'foods' && enabled) {
      return {
        data: mockFoodsData,
        isLoading: mockFoodsLoading,
        isError: mockFoodsError,
        error: mockFoodsErrorObj,
      };
    }
    if (key === 'menus' && enabled) {
      return {
        data: mockMenusData,
        isLoading: mockMenusLoading,
        isError: mockMenusError,
        error: mockMenusErrorObj,
      };
    }
    return { data: undefined, isLoading: false, isError: false, error: null };
  },
}));

const mockFoods: Food[] = [
  {
    id: 'food-1',
    name: 'Rice',
    nutrition: [{ unit: '100g', base_amount: 100, calories: 130 }],
  },
  {
    id: 'food-2',
    name: 'Apple',
    nutrition: [{ unit: '1個', base_amount: 1, calories: 95 }],
  },
];

const mockMenus: Menu[] = [
  {
    id: 'menu-1',
    name: 'Curry',
    nutrition: [{ unit: '1人前', base_amount: 1, calories: 600 }],
  },
];

describe('FoodSearch', () => {
  beforeEach(() => {
    mockOnSelect.mockClear();
    mockFoodsData = [];
    mockMenusData = [];
    mockFoodsLoading = false;
    mockMenusLoading = false;
    mockFoodsError = false;
    mockMenusError = false;
    mockFoodsErrorObj = null;
    mockMenusErrorObj = null;
  });

  it('renders tabs and search input', () => {
    render(<FoodSearch onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /foods/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /menus/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('searchPlaceholder')).toBeInTheDocument();
  });

  it('shows loading state when foods are loading', () => {
    mockFoodsLoading = true;
    render(<FoodSearch onSelect={mockOnSelect} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty message when no foods', () => {
    mockFoodsData = [];
    render(<FoodSearch onSelect={mockOnSelect} />);
    expect(screen.getByText('noResults')).toBeInTheDocument();
  });

  it('shows food list and calls onSelect when item clicked', async () => {
    mockFoodsData = mockFoods;
    render(<FoodSearch onSelect={mockOnSelect} />);
    await waitFor(() => {
      expect(screen.getByText('Rice')).toBeInTheDocument();
    });
    expect(screen.getByText('Apple')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Rice'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockFoods[0], 'food');
  });

  it('switches to Menus tab and shows menu list', async () => {
    mockFoodsData = mockFoods;
    mockMenusData = mockMenus;
    render(<FoodSearch onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /menus/i }));
    await waitFor(() => {
      expect(screen.getByText('Curry')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Curry'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockMenus[0], 'menu');
  });

  it('shows error state when foods query fails', () => {
    mockFoodsError = true;
    mockFoodsErrorObj = new Error('Network error');
    render(<FoodSearch onSelect={mockOnSelect} />);
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });
});
