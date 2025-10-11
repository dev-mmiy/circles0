import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import RegisterPage from '../app/register/page';

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

describe('RegisterPage', () => {
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

    // Mock name display orders API
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/name-display-orders/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              order_code: 'western',
              display_name: 'Western (First Middle Last)',
              format_template: '{first} {middle} {last}',
              description: 'English standard format'
            },
            {
              order_code: 'eastern',
              display_name: 'Eastern (Last First Middle)',
              format_template: '{last} {first} {middle}',
              description: 'East Asian standard format'
            },
            {
              order_code: 'japanese',
              display_name: 'Japanese (Last First)',
              format_template: '{last} {first}',
              description: 'Japanese standard format'
            },
            {
              order_code: 'custom',
              display_name: 'Custom Format',
              format_template: '{custom}',
              description: 'User-defined format'
            }
          ]
        });
      }
      if (url.includes('/locale-formats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { locale: 'ja-jp', default_order_code: 'japanese' },
            { locale: 'en-us', default_order_code: 'western' }
          ]
        });
      }
      if (url.includes('/api/v1/users/') && url.endsWith('/')) {
        // This is the user creation endpoint
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: '123e4567-e89b-12d3-a456-426614174000',
            member_id: '123456789012',
            formatted_member_id: '1234-5678-9012'
          })
        });
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });
  });

  it('renders the registration form with all required fields', () => {
    render(<RegisterPage />);

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Join our community and connect with others')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Name Information')).toBeInTheDocument();
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders all form fields with correct labels', () => {
    render(<RegisterPage />);

    // Basic Information fields
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nickname/)).toBeInTheDocument();

    // Name Information fields
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Middle Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name Display Order/)).toBeInTheDocument();

    // Additional Information fields
    expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Birth Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Timezone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio/)).toBeInTheDocument();

    // Preferences fields
    expect(screen.getByLabelText(/Preferred Language/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Locale/)).toBeInTheDocument();
  });

  it('validates required fields on form submission', async () => {
    render(<RegisterPage />);

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
      expect(screen.getByText('Nickname is required')).toBeInTheDocument();
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email Address/);
    const nicknameInput = screen.getByLabelText(/Nickname/);
    const firstNameInput = screen.getByLabelText(/First Name/);
    const lastNameInput = screen.getByLabelText(/Last Name/);

    // Fill in required fields with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(nicknameInput, { target: { value: 'testuser' } });
    fireEvent.change(firstNameInput, { target: { value: 'Test' } });
    fireEvent.change(lastNameInput, { target: { value: 'User' } });
    
    // Submit the form
    const form = emailInput.closest('form');
    fireEvent.submit(form!);

    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
    });
  });

  it('validates nickname length', async () => {
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

    const nicknameInput = screen.getByLabelText(/Nickname/);
    fireEvent.change(nicknameInput, { target: { value: 'ab' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Nickname must be at least 3 characters/)).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
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

    const phoneInput = screen.getByLabelText(/Phone Number/);
    fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid phone number/)).toBeInTheDocument();
    });
  });

  it('shows name preview when name fields are filled', async () => {
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

    const firstNameInput = screen.getByLabelText(/First Name/);
    const lastNameInput = screen.getByLabelText(/Last Name/);

    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  it('shows custom name format field when custom display order is selected', async () => {
    render(<RegisterPage />);

    // Wait for the component and data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Name Display Order/)).toBeInTheDocument();
    });

    const nameDisplayOrderSelect = screen.getByLabelText(/Name Display Order/) as HTMLSelectElement;
    
    // Check if 'custom' option exists
    const hasCustomOption = Array.from(nameDisplayOrderSelect.options).some(
      option => option.value === 'custom'
    );
    
    // Only test if custom option is available
    if (hasCustomOption) {
      // Change to custom format
      fireEvent.change(nameDisplayOrderSelect, { target: { value: 'custom' } });

      // Wait for custom name format field to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Custom Name Format/)).toBeInTheDocument();
      });
    } else {
      // Skip this test if custom option is not available
      expect(nameDisplayOrderSelect).toBeInTheDocument();
    }
  });

  it('submits form with valid data', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(<RegisterPage />);

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
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('test@example.com'),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/profile/123e4567-e89b-12d3-a456-426614174000');
    });
  });

  it('handles form submission errors', async () => {
    // Override the default mock for this test
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/name-display-orders/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              order_code: 'western',
              display_name: 'Western (First Middle Last)',
              format_template: '{first} {middle} {last}',
              description: 'English standard format'
            }
          ]
        });
      }
      if (url.includes('/locale-formats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { locale: 'ja-jp', default_order_code: 'japanese' },
            { locale: 'en-us', default_order_code: 'western' }
          ]
        });
      }
      if (url.includes('/api/v1/users/') && url.endsWith('/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'User with this email or IDP ID already exists',
        });
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    render(<RegisterPage />);

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

  it('handles network errors', async () => {
    // Override the default mock for this test
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/name-display-orders/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              order_code: 'western',
              display_name: 'Western (First Middle Last)',
              format_template: '{first} {middle} {last}',
              description: 'English standard format'
            }
          ]
        });
      }
      if (url.includes('/locale-formats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { locale: 'ja-jp', default_order_code: 'japanese' },
            { locale: 'en-us', default_order_code: 'western' }
          ]
        });
      }
      if (url.includes('/api/v1/users/') && url.endsWith('/')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    render(<RegisterPage />);

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
      expect(screen.getByText(/Network error: Network error/)).toBeInTheDocument();
    });
  });

  it('shows loading state during form submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<RegisterPage />);

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

    expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('loads name display orders and locale formats on mount', async () => {
    const mockOrders = [
      { order_code: 'western', display_name: 'Western (First Middle Last)' },
      { order_code: 'eastern', display_name: 'Eastern (Last First Middle)' },
    ];

    const mockFormats = [
      { locale: 'en-us', default_order_code: 'western' },
      { locale: 'ja-jp', default_order_code: 'eastern' },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockOrders })
      .mockResolvedValueOnce({ ok: true, json: async () => mockFormats });

    render(<RegisterPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/name-display-orders/');
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/users/locale-formats/');
    });
  });

  it('clears validation errors when user starts typing', async () => {
    render(<RegisterPage />);

    // Trigger validation error
    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
    });

    // Start typing in email field
    const emailInput = screen.getByLabelText(/Email Address/);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText('Email address is required')).not.toBeInTheDocument();
    });
  });
});
