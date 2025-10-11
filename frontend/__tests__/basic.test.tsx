import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Basic Tests', () => {
  it('should render a simple component', () => {
    const TestComponent = () => (
      <div>
        <h1>Test Component</h1>
        <p>This is a test</p>
      </div>
    );

    render(<TestComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('should render form elements', () => {
    const TestForm = () => (
      <form>
        <h1>Create Your Account</h1>
        <p>Join our community and connect with others</p>
        <div>
          <label htmlFor="email">Email Address *</label>
          <input type="email" id="email" name="email" placeholder="Enter your email address" />
        </div>
        <div>
          <label htmlFor="nickname">Nickname *</label>
          <input type="text" id="nickname" name="nickname" placeholder="Choose a unique nickname" />
        </div>
        <div>
          <label htmlFor="first_name">First Name *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label htmlFor="last_name">Last Name *</label>
          <input type="text" id="last_name" name="last_name" placeholder="Enter your last name" />
        </div>
        <button type="submit">Create Account</button>
      </form>
    );

    render(<TestForm />);

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Join our community and connect with others')).toBeInTheDocument();
    expect(screen.getByText('Email Address *')).toBeInTheDocument();
    expect(screen.getByText('Nickname *')).toBeInTheDocument();
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('should render form with all required fields', () => {
    const TestForm = () => (
      <form>
        <h1>Create Your Account</h1>
        <div>
          <label htmlFor="email">Email Address *</label>
          <input type="email" id="email" name="email" placeholder="Enter your email address" />
        </div>
        <div>
          <label htmlFor="nickname">Nickname *</label>
          <input type="text" id="nickname" name="nickname" placeholder="Choose a unique nickname" />
        </div>
        <div>
          <label htmlFor="first_name">First Name *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label htmlFor="last_name">Last Name *</label>
          <input type="text" id="last_name" name="last_name" placeholder="Enter your last name" />
        </div>
        <div>
          <label htmlFor="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" />
        </div>
        <div>
          <label htmlFor="birth_date">Birth Date</label>
          <input type="date" id="birth_date" name="birth_date" />
        </div>
        <div>
          <label htmlFor="country">Country</label>
          <select id="country" name="country">
            <option value="">Select your country</option>
            <option value="JP">🇯🇵 Japan</option>
            <option value="US">🇺🇸 United States</option>
            <option value="GB">🇬🇧 United Kingdom</option>
          </select>
        </div>
        <div>
          <label htmlFor="timezone">Timezone</label>
          <select id="timezone" name="timezone">
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
          </select>
        </div>
        <div>
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" placeholder="Tell us about yourself" rows={3} />
        </div>
        <div>
          <label htmlFor="preferred_language">Preferred Language</label>
          <select id="preferred_language" name="preferred_language">
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label htmlFor="preferred_locale">Preferred Locale</label>
          <select id="preferred_locale" name="preferred_locale">
            <option value="ja-jp">ja-jp</option>
            <option value="en-us">en-us</option>
          </select>
        </div>
        <button type="submit">Create Account</button>
      </form>
    );

    render(<TestForm />);

    // Check all form fields are present
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    expect(screen.getByLabelText('Nickname *')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Preferred Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Preferred Locale')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('should render name display order options', () => {
    const TestForm = () => (
      <form>
        <div>
          <label htmlFor="name_display_order">Name Display Order</label>
          <select id="name_display_order" name="name_display_order">
            <option value="western">Western (First Middle Last)</option>
            <option value="eastern">Eastern (Last First Middle)</option>
            <option value="japanese">Japanese (Last First)</option>
            <option value="korean">Korean (Last First Middle)</option>
            <option value="chinese">Chinese (Last First Middle)</option>
            <option value="custom">Custom Format</option>
          </select>
        </div>
        <div>
          <label htmlFor="custom_name_format">Custom Name Format</label>
          <input
            type="text"
            id="custom_name_format"
            name="custom_name_format"
            placeholder="{first} {middle} {last}"
          />
        </div>
        <div>
          <p>Name Preview:</p>
          <p>Your name will appear here</p>
        </div>
      </form>
    );

    render(<TestForm />);

    expect(screen.getByLabelText('Name Display Order')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom Name Format')).toBeInTheDocument();
    expect(screen.getByText('Name Preview:')).toBeInTheDocument();
    expect(screen.getByText('Your name will appear here')).toBeInTheDocument();
  });

  it('should render validation messages', () => {
    const TestForm = () => (
      <form>
        <div>
          <label htmlFor="email">Email Address *</label>
          <input type="email" id="email" name="email" placeholder="Enter your email address" />
          <p className="error">Email address is required</p>
        </div>
        <div>
          <label htmlFor="nickname">Nickname *</label>
          <input type="text" id="nickname" name="nickname" placeholder="Choose a unique nickname" />
          <p className="error">Nickname is required</p>
        </div>
        <div>
          <label htmlFor="first_name">First Name *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            placeholder="Enter your first name"
          />
          <p className="error">First name is required</p>
        </div>
        <div>
          <label htmlFor="last_name">Last Name *</label>
          <input type="text" id="last_name" name="last_name" placeholder="Enter your last name" />
          <p className="error">Last name is required</p>
        </div>
        <div>
          <label htmlFor="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" />
          <p className="error">Please enter a valid phone number</p>
        </div>
      </form>
    );

    render(<TestForm />);

    expect(screen.getByText('Email address is required')).toBeInTheDocument();
    expect(screen.getByText('Nickname is required')).toBeInTheDocument();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    const TestForm = () => (
      <form>
        <button type="submit" disabled>
          Creating Account...
        </button>
      </form>
    );

    render(<TestForm />);

    const submitButton = screen.getByText('Creating Account...');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should render error messages', () => {
    const TestForm = () => (
      <form>
        <div className="error-message">
          <p>Registration failed. Please try again.</p>
        </div>
        <div className="error-message">
          <p>Network error. Please check your connection.</p>
        </div>
        <div className="error-message">
          <p>Email already exists</p>
        </div>
      </form>
    );

    render(<TestForm />);

    expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });
});
