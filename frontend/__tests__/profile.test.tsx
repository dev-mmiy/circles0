import { render, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'next-i18next';
import { useParams } from 'next/navigation';
import ProfilePage from '../app/profile/[id]/page';

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockTranslation = jest.fn();

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useParams as jest.Mock).mockReturnValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });
    
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockTranslation,
    });
    
    // Setup translation mock
    mockTranslation.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.back_to_home': 'Back to Home',
        'common.create_new_account': 'Create New Account',
      };
      return translations[key] || key;
    });
  });

  it('shows loading state initially', () => {
    render(<ProfilePage />);
    
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('displays user profile when user data is loaded', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      phone: '+1234567890',
      birth_date: '1990-01-01',
      country_code: 'US',
      timezone: 'America/New_York',
      display_name: 'Test User',
      bio: 'Test bio',
      avatar_url: 'https://example.com/avatar.jpg',
      is_profile_public: true,
      show_age_range: true,
      preferred_language: 'en',
      preferred_locale: 'en-us',
      created_at: '2023-01-01T00:00:00Z',
      last_active_at: '2023-01-02T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('Member ID: 1234-5678-9012')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
    });
  });

  it('displays error message when user is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('displays error message when profile is private', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Profile is private')).toBeInTheDocument();
    });
  });

  it('displays error message when network error occurs', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows age when show_age_range is true', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      birth_date: '1990-01-01',
      show_age_range: true,
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/years old/)).toBeInTheDocument();
    });
  });

  it('shows "Not shown" when show_age_range is false', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      birth_date: '1990-01-01',
      show_age_range: false,
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Not shown')).toBeInTheDocument();
    });
  });

  it('displays avatar when avatar_url is provided', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('displays initials when avatar_url is not provided', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('TU')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
      last_active_at: '2023-01-02T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      // Check that dates are displayed (format may vary by locale)
      expect(screen.getByText(/1\/1\/2023/)).toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
      email: 'test@example.com',
      nickname: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      is_profile_public: true,
      created_at: '2023-01-01T00:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
