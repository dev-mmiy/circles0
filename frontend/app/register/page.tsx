'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface NameDisplayOrder {
  order_code: string;
  display_name: string;
  format_template: string;
  description: string;
}

interface LocaleNameFormat {
  locale: string;
  default_order_code: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    country_code: '',
    timezone: 'Asia/Tokyo',
    display_name: '',
    bio: '',
    preferred_language: 'ja',
    preferred_locale: 'ja-jp',
    name_display_order: 'western',
    custom_name_format: '',
  });

  const [nameDisplayOrders, setNameDisplayOrders] = useState<NameDisplayOrder[]>([]);
  const [localeFormats, setLocaleFormats] = useState<LocaleNameFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load name display orders and locale formats on component mount
  useState(() => {
    const loadData = async () => {
      try {
        const [ordersResponse, formatsResponse] = await Promise.all([
          fetch('http://localhost:8000/api/v1/users/name-display-orders/'),
          fetch('http://localhost:8000/api/v1/users/locale-formats/'),
        ]);

        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          setNameDisplayOrders(orders);
        }

        if (formatsResponse.ok) {
          const formats = await formatsResponse.json();
          setLocaleFormats(formats);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };

    loadData();
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

        if (!formData.email) {
          newErrors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.nickname) {
          newErrors.nickname = 'Nickname is required';
        } else if (formData.nickname.length < 3) {
          newErrors.nickname = 'Nickname must be at least 3 characters';
        }

        if (!formData.first_name) {
          newErrors.first_name = 'First name is required';
        }

        if (!formData.last_name) {
          newErrors.last_name = 'Last name is required';
        }

        if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
          newErrors.phone = 'Please enter a valid phone number';
        }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting form data:', formData);
      
      const response = await fetch('http://localhost:8000/api/v1/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          idp_id: `auth0|${Date.now()}`, // Temporary ID for demo
          idp_provider: 'auth0',
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const user = await response.json();
        console.log('User created successfully:', user);
        router.push(`/profile/${user.id}`);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          setErrors({ submit: errorData.detail || 'Registration failed. Please try again.' });
        } catch (parseError) {
          setErrors({ submit: `Server error: ${response.status} - ${errorText}` });
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ submit: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  const getFullNamePreview = () => {
    const { first_name, middle_name, last_name, name_display_order, custom_name_format } = formData;

    if (name_display_order === 'custom' && custom_name_format) {
      return custom_name_format
        .replace('{first}', first_name || '')
        .replace('{middle}', middle_name || '')
        .replace('{last}', last_name || '')
        .replace('{custom}', custom_name_format);
    }

    const order = nameDisplayOrders.find(o => o.order_code === name_display_order);
    if (!order) return '';

    return order.format_template
      .replace('{first}', first_name || '')
      .replace('{middle}', middle_name || '')
      .replace('{last}', last_name || '');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{color: '#111827'}}>Create Your Account</h1>
              <p className="text-gray-600" style={{color: '#6b7280'}}>Join our community and connect with others</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{color: '#111827'}}>
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1" style={{color: '#374151'}}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label
                      htmlFor="nickname"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Nickname *
                    </label>
                    <input
                      type="text"
                      id="nickname"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.nickname ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Choose a unique nickname"
                    />
                    {errors.nickname && (
                      <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Name Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.first_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your first name"
                    />
                    {errors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="middle_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Middle Name
                    </label>
                    <input
                      type="text"
                      id="middle_name"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your middle name (optional)"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.last_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your last name"
                    />
                    {errors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                    )}
                  </div>
                </div>

                {/* Name Display Order */}
                <div className="mt-4">
                  <label
                    htmlFor="name_display_order"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name Display Order
                  </label>
                  <select
                    id="name_display_order"
                    name="name_display_order"
                    value={formData.name_display_order}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {nameDisplayOrders.map(order => (
                      <option key={order.order_code} value={order.order_code}>
                        {order.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Name Format */}
                {formData.name_display_order === 'custom' && (
                  <div className="mt-4">
                    <label
                      htmlFor="custom_name_format"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Custom Name Format
                    </label>
                    <input
                      type="text"
                      id="custom_name_format"
                      name="custom_name_format"
                      value={formData.custom_name_format}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="{first} {middle} {last}"
                    />
                    <p className="mt-1 text-sm text-gray-500">Use {first}, {middle}, {last} to format your name</p>
                  </div>
                )}

                {/* Name Preview */}
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">Name Preview:</p>
                  <p className="text-lg font-medium text-gray-900">
                    {getFullNamePreview() || 'Your name will appear here'}
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Additional Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1" style={{color: '#374151'}}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label
                      htmlFor="birth_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Birth Date
                    </label>
                    <input
                      type="date"
                      id="birth_date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="country_code"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Country
                    </label>
                    <select
                      id="country_code"
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select your country</option>
                      <option value="JP">🇯🇵 Japan</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="KR">🇰🇷 South Korea</option>
                      <option value="CN">🇨🇳 China</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="timezone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Seoul">Asia/Seoul</option>
                      <option value="Asia/Shanghai">Asia/Shanghai</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1" style={{color: '#374151'}}>
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Preferences
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="preferred_language"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Preferred Language
                    </label>
                    <select
                      id="preferred_language"
                      name="preferred_language"
                      value={formData.preferred_language}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="preferred_locale"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Preferred Locale
                    </label>
                    <select
                      id="preferred_locale"
                      name="preferred_locale"
                      value={formData.preferred_locale}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ja-jp">ja-jp</option>
                      <option value="en-us">en-us</option>
                      <option value="en-gb">en-gb</option>
                      <option value="ko-kr">ko-kr</option>
                      <option value="zh-cn">zh-cn</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                  Back to Home
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              {errors.submit && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
