import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/navigation';
import RegisterPage from '../app/register/page';

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: jest.fn(),
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
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates nickname length', async () => {
    render(<RegisterPage />);

    const nicknameInput = screen.getByLabelText(/Nickname/);
    fireEvent.change(nicknameInput, { target: { value: 'ab' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Nickname must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    render(<RegisterPage />);

    const phoneInput = screen.getByLabelText(/Phone Number/);
    fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('shows name preview when name fields are filled', () => {
    render(<RegisterPage />);

    const firstNameInput = screen.getByLabelText(/First Name/);
    const lastNameInput = screen.getByLabelText(/Last Name/);

    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows custom name format field when custom display order is selected', () => {
    render(<RegisterPage />);

    const nameDisplayOrderSelect = screen.getByLabelText(/Name Display Order/);
    fireEvent.change(nameDisplayOrderSelect, { target: { value: 'custom' } });

    expect(screen.getByLabelText(/Custom Name Format/)).toBeInTheDocument();
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
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/users/', {
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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'User already exists' }),
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
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

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
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
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
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/users/name-display-orders/');
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/users/locale-formats/');
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
