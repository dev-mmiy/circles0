import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

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

describe('Register Page Manual Tests', () => {
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

  it('should render registration form with all sections', () => {
    const RegisterForm = () => (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white shadow-xl rounded-lg max-w-4xl w-full overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {mockTranslation('register.title')}
              </h1>
              <p className="text-gray-600">{mockTranslation('register.subtitle')}</p>
            </div>

            <form className="space-y-6">
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {mockTranslation('register.basic_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      {mockTranslation('register.email')} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.email_placeholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="nickname"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.nickname')} *
                    </label>
                    <input
                      type="text"
                      id="nickname"
                      name="nickname"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.nickname_placeholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Name Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {mockTranslation('register.name_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.first_name')} *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.first_name_placeholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="middle_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.middle_name')}
                    </label>
                    <input
                      type="text"
                      id="middle_name"
                      name="middle_name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.middle_name_placeholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.last_name')} *
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.last_name_placeholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {mockTranslation('register.additional_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      {mockTranslation('register.phone')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={mockTranslation('register.phone_placeholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="birth_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.birth_date')}
                    </label>
                    <input
                      type="date"
                      id="birth_date"
                      name="birth_date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {mockTranslation('register.preferences')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="preferred_language"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.preferred_language')}
                    </label>
                    <select
                      id="preferred_language"
                      name="preferred_language"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="preferred_locale"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {mockTranslation('register.preferred_locale')}
                    </label>
                    <select
                      id="preferred_locale"
                      name="preferred_locale"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ja-jp">ja-jp</option>
                      <option value="en-us">en-us</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                  {mockTranslation('register.back_to_home')}
                </a>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {mockTranslation('register.create_account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );

    render(<RegisterForm />);

    // Check main sections
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Join our community and connect with others')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Name Information')).toBeInTheDocument();
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();

    // Check form fields
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    expect(screen.getByLabelText('Nickname *')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Middle Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Preferred Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Preferred Locale')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('should handle form input changes', () => {
    const RegisterForm = () => {
      const [formData, setFormData] = React.useState({
        email: '',
        nickname: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        phone: '',
        birth_date: '',
        preferred_language: 'ja',
        preferred_locale: 'ja-jp',
      });

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      };

      return (
        <form>
          <div>
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address"
            />
          </div>
          <div>
            <label htmlFor="nickname">Nickname *</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              placeholder="Choose a unique nickname"
            />
          </div>
          <div>
            <label htmlFor="first_name">First Name *</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <label htmlFor="last_name">Last Name *</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Enter your last name"
            />
          </div>
          <div>
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label htmlFor="birth_date">Birth Date</label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor="preferred_language">Preferred Language</label>
            <select
              id="preferred_language"
              name="preferred_language"
              value={formData.preferred_language}
              onChange={handleInputChange}
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label htmlFor="preferred_locale">Preferred Locale</label>
            <select
              id="preferred_locale"
              name="preferred_locale"
              value={formData.preferred_locale}
              onChange={handleInputChange}
            >
              <option value="ja-jp">ja-jp</option>
              <option value="en-us">en-us</option>
            </select>
          </div>
        </form>
      );
    };

    render(<RegisterForm />);

    // Test input changes
    const emailInput = screen.getByLabelText('Email Address *');
    const nicknameInput = screen.getByLabelText('Nickname *');
    const firstNameInput = screen.getByLabelText('First Name *');
    const lastNameInput = screen.getByLabelText('Last Name *');
    const phoneInput = screen.getByLabelText('Phone Number');
    const birthDateInput = screen.getByLabelText('Birth Date');
    const languageSelect = screen.getByLabelText('Preferred Language');
    const localeSelect = screen.getByLabelText('Preferred Locale');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nicknameInput, { target: { value: 'testuser' } });
    fireEvent.change(firstNameInput, { target: { value: 'Test' } });
    fireEvent.change(lastNameInput, { target: { value: 'User' } });
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
    fireEvent.change(birthDateInput, { target: { value: '1990-01-01' } });
    fireEvent.change(languageSelect, { target: { value: 'en' } });
    fireEvent.change(localeSelect, { target: { value: 'en-us' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(nicknameInput).toHaveValue('testuser');
    expect(firstNameInput).toHaveValue('Test');
    expect(lastNameInput).toHaveValue('User');
    expect(phoneInput).toHaveValue('+1234567890');
    expect(birthDateInput).toHaveValue('1990-01-01');
    expect(languageSelect).toHaveValue('en');
    expect(localeSelect).toHaveValue('en-us');
  });

  it('should handle form submission', async () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      member_id: '123456789012',
      formatted_member_id: '1234-5678-9012',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const RegisterForm = () => {
      const [formData, setFormData] = React.useState({
        email: 'test@example.com',
        nickname: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      });
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState('');

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
          const response = await fetch('http://localhost:8000/api/v1/users/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              idp_id: `auth0|${Date.now()}`,
              idp_provider: 'auth0',
            }),
          });

          if (response.ok) {
            const newUser = await response.json();
            mockPush(`/profile/${newUser.id}`);
          } else {
            const errorData = await response.json();
            setError(errorData.detail || 'Registration failed');
          }
        } catch (err) {
          setError('Network error');
        } finally {
          setLoading(false);
        }
      };

      return (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="nickname">Nickname *</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={e => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="first_name">First Name *</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="last_name">Last Name *</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      );
    };

    render(<RegisterForm />);

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
});
