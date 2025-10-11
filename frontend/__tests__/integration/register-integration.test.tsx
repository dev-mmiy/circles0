import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import RegisterPage from '../../app/register/page';

// Mock next-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({ t: (key) => key })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockTranslation = jest.fn();

describe('RegisterPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useTranslation as jest.Mock).mockReturnValue({
      t: mockTranslation,
    });

    // Setup translation mock
    mockTranslation.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'register.title': 'Create Your Account',
        'register.subtitle': 'Join our community and connect with others',
        'register.basic_info': 'Basic Information',
        'register.name_info': 'Name Information',
        'register.additional_info': 'Additional Information',
        'register.preferences': 'Preferences',
        'register.email': 'Email Address',
        'register.email_placeholder': 'Enter your email address',
        'register.nickname': 'Nickname',
        'register.nickname_placeholder': 'Choose a unique nickname',
        'register.first_name': 'First Name',
        'register.first_name_placeholder': 'Enter your first name',
        'register.middle_name': 'Middle Name',
        'register.middle_name_placeholder': 'Enter your middle name (optional)',
        'register.last_name': 'Last Name',
        'register.last_name_placeholder': 'Enter your last name',
        'register.name_display_order': 'Name Display Order',
        'register.custom_name_format': 'Custom Name Format',
        'register.custom_format_help': 'Use {first}, {middle}, {last} to format your name',
        'register.name_preview': 'Name Preview',
        'register.name_preview_empty': 'Your name will appear here',
        'register.phone': 'Phone Number',
        'register.phone_placeholder': 'Enter your phone number',
        'register.birth_date': 'Birth Date',
        'register.country': 'Country',
        'register.select_country': 'Select your country',
        'register.timezone': 'Timezone',
        'register.bio': 'Bio',
        'register.bio_placeholder': 'Tell us about yourself',
        'register.preferred_language': 'Preferred Language',
        'register.preferred_locale': 'Preferred Locale',
        'register.back_to_home': 'Back to Home',
        'register.create_account': 'Create Account',
        'register.creating': 'Creating Account...',
        'validation.email_required': 'Email address is required',
        'validation.email_invalid': 'Please enter a valid email address',
        'validation.nickname_required': 'Nickname is required',
        'validation.nickname_too_short': 'Nickname must be at least 3 characters',
        'validation.first_name_required': 'First name is required',
        'validation.last_name_required': 'Last name is required',
        'validation.phone_invalid': 'Please enter a valid phone number',
        'errors.registration_failed': 'Registration failed. Please try again.',
        'errors.network_error': 'Network error. Please check your connection.',
      };
      return translations[key] || key;
    });
  });

  describe('Complete Registration Flow', () => {
    it('completes full registration process with all fields', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123456789012',
        formatted_member_id: '1234-5678-9012',
      };

      const mockOrders = [
        {
          order_code: 'western',
          display_name: 'Western (First Middle Last)',
          format_template: '{first} {middle} {last}',
        },
        {
          order_code: 'eastern',
          display_name: 'Eastern (Last First Middle)',
          format_template: '{last} {first} {middle}',
        },
        {
          order_code: 'japanese',
          display_name: 'Japanese (Last First)',
          format_template: '{last} {first}',
        },
        { order_code: 'custom', display_name: 'Custom Format', format_template: '{custom}' },
      ];

      const mockFormats = [
        { locale: 'en-us', default_order_code: 'western' },
        { locale: 'ja-jp', default_order_code: 'japanese' },
      ];

      // Mock API calls
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFormats })
        .mockResolvedValueOnce({ ok: true, json: async () => mockUser });

      render(<RegisterPage />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/locale-formats/');
      });

      // Fill in all form fields
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Nickname/), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText(/Middle Name/), {
        target: { value: 'Michael' },
      });
      fireEvent.change(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: '+1234567890' },
      });
      fireEvent.change(screen.getByLabelText(/Birth Date/), {
        target: { value: '1990-01-01' },
      });
      fireEvent.change(screen.getByLabelText(/Country/), {
        target: { value: 'US' },
      });
      fireEvent.change(screen.getByLabelText(/Timezone/), {
        target: { value: 'America/New_York' },
      });
      fireEvent.change(screen.getByLabelText(/Bio/), {
        target: { value: 'This is a test bio' },
      });
      fireEvent.change(screen.getByLabelText(/Preferred Language/), {
        target: { value: 'en' },
      });
      fireEvent.change(screen.getByLabelText(/Preferred Locale/), {
        target: { value: 'en-us' },
      });

      // Check name preview
      expect(screen.getByText('John Michael Doe')).toBeInTheDocument();

      // Submit form
      const submitButton = screen.getByText('Create Account');
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('test@example.com'),
        });
      });

      // Verify navigation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile/123e4567-e89b-12d3-a456-426614174000');
      });
    });

    it('handles different name display orders correctly', async () => {
      const mockOrders = [
        {
          order_code: 'western',
          display_name: 'Western (First Middle Last)',
          format_template: '{first} {middle} {last}',
        },
        {
          order_code: 'eastern',
          display_name: 'Eastern (Last First Middle)',
          format_template: '{last} {first} {middle}',
        },
        {
          order_code: 'japanese',
          display_name: 'Japanese (Last First)',
          format_template: '{last} {first}',
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RegisterPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
      });

      // Fill in name fields
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText(/Middle Name/), {
        target: { value: 'Michael' },
      });
      fireEvent.change(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' },
      });

      // Test Western order (default)
      expect(screen.getByText('John Michael Doe')).toBeInTheDocument();

      // Test Eastern order
      fireEvent.change(screen.getByLabelText(/Name Display Order/), {
        target: { value: 'eastern' },
      });
      expect(screen.getByText('Doe John Michael')).toBeInTheDocument();

      // Test Japanese order
      fireEvent.change(screen.getByLabelText(/Name Display Order/), {
        target: { value: 'japanese' },
      });
      expect(screen.getByText('Doe John')).toBeInTheDocument();
    });

    it('handles custom name format correctly', async () => {
      const mockOrders = [
        { order_code: 'custom', display_name: 'Custom Format', format_template: '{custom}' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RegisterPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
      });

      // Fill in name fields
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText(/Middle Name/), {
        target: { value: 'Michael' },
      });
      fireEvent.change(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' },
      });

      // Select custom format
      fireEvent.change(screen.getByLabelText(/Name Display Order/), {
        target: { value: 'custom' },
      });

      // Custom format field should appear
      expect(screen.getByLabelText(/Custom Name Format/)).toBeInTheDocument();

      // Enter custom format
      fireEvent.change(screen.getByLabelText(/Custom Name Format/), {
        target: { value: '{last}, {first} {middle}' },
      });

      // Check preview
      expect(screen.getByText('Doe, John Michael')).toBeInTheDocument();
    });

    it('handles form validation with multiple errors', async () => {
      // Mock the API calls
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/name-display-orders/')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }
        if (url.includes('/locale-formats/')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<RegisterPage />);

      // Submit empty form
      const submitButton = screen.getByText('Create Account');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email address is required')).toBeInTheDocument();
        expect(screen.getByText('Nickname is required')).toBeInTheDocument();
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });

      // Fill in invalid data
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: 'invalid-email' },
      });
      fireEvent.change(screen.getByLabelText(/Nickname/), {
        target: { value: 'ab' },
      });
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: 'invalid-phone' },
      });

      const form = screen.getByLabelText(/Email Address/).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
        expect(screen.getByText(/Nickname must be at least 3 characters/)).toBeInTheDocument();
        expect(screen.getByText(/Please enter a valid phone number/)).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      const mockOrders = [
        {
          order_code: 'western',
          display_name: 'Western (First Middle Last)',
          format_template: '{first} {middle} {last}',
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'User with this email or IDP ID already exists',
        });

      render(<RegisterPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
      });

      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Nickname/), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText(/Last Name/), {
        target: { value: 'User' },
      });

      const submitButton = screen.getByText('Create Account');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/User with this email or IDP ID already exists/)).toBeInTheDocument();
      });
    });

    it('handles network errors during form submission', async () => {
      const mockOrders = [
        {
          order_code: 'western',
          display_name: 'Western (First Middle Last)',
          format_template: '{first} {middle} {last}',
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<RegisterPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
      });

      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Nickname/), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText(/Last Name/), {
        target: { value: 'User' },
      });

      const submitButton = screen.getByText('Create Account');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Network error: Network error/)
        ).toBeInTheDocument();
      });
    });
  });
});
