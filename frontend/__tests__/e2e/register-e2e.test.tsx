import { test, expect } from '@playwright/test';

test.describe('Register Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/users/name-display-orders/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { order_code: 'western', display_name: 'Western (First Middle Last)', format_template: '{first} {middle} {last}' },
          { order_code: 'eastern', display_name: 'Eastern (Last First Middle)', format_template: '{last} {first} {middle}' },
          { order_code: 'japanese', display_name: 'Japanese (Last First)', format_template: '{last} {first}' },
          { order_code: 'custom', display_name: 'Custom Format', format_template: '{custom}' },
        ]),
      });
    });

    await page.route('**/api/v1/users/locale-formats/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { locale: 'en-us', default_order_code: 'western' },
          { locale: 'ja-jp', default_order_code: 'japanese' },
        ]),
      });
    });

    await page.goto('/register');
  });

  test('should display registration form with all sections', async ({ page }) => {
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByText('Join our community and connect with others')).toBeVisible();
    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('Name Information')).toBeVisible();
    await expect(page.getByText('Additional Information')).toBeVisible();
    await expect(page.getByText('Preferences')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await expect(page.getByText('Email address is required')).toBeVisible();
    await expect(page.getByText('Nickname is required')).toBeVisible();
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel('Email Address').fill('invalid-email');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should validate nickname length', async ({ page }) => {
    await page.getByLabel('Nickname').fill('ab');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await expect(page.getByText('Nickname must be at least 3 characters')).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    await page.getByLabel('Phone Number').fill('invalid-phone');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
  });

  test('should show name preview with different display orders', async ({ page }) => {
    // Fill in name fields
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Middle Name').fill('Michael');
    await page.getByLabel('Last Name').fill('Doe');
    
    // Check Western order (default)
    await expect(page.getByText('John Michael Doe')).toBeVisible();
    
    // Test Eastern order
    await page.getByLabel('Name Display Order').selectOption('eastern');
    await expect(page.getByText('Doe John Michael')).toBeVisible();
    
    // Test Japanese order
    await page.getByLabel('Name Display Order').selectOption('japanese');
    await expect(page.getByText('Doe John')).toBeVisible();
  });

  test('should show custom name format field when custom order is selected', async ({ page }) => {
    await page.getByLabel('Name Display Order').selectOption('custom');
    
    await expect(page.getByLabel('Custom Name Format')).toBeVisible();
    await expect(page.getByText('Use {first}, {middle}, {last} to format your name')).toBeVisible();
  });

  test('should handle custom name format correctly', async ({ page }) => {
    // Fill in name fields
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Middle Name').fill('Michael');
    await page.getByLabel('Last Name').fill('Doe');
    
    // Select custom format
    await page.getByLabel('Name Display Order').selectOption('custom');
    
    // Enter custom format
    await page.getByLabel('Custom Name Format').fill('{last}, {first} {middle}');
    
    // Check preview
    await expect(page.getByText('Doe, John Michael')).toBeVisible();
  });

  test('should clear validation errors when user starts typing', async ({ page }) => {
    // Trigger validation error
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Email address is required')).toBeVisible();
    
    // Start typing in email field
    await page.getByLabel('Email Address').fill('test@example.com');
    
    // Error should be cleared
    await expect(page.getByText('Email address is required')).not.toBeVisible();
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/v1/users/', async route => {
      // Add delay to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123e4567-e89b-12d3-a456-426614174000',
          member_id: '123456789012',
          formatted_member_id: '1234-5678-9012',
        }),
      });
    });

    // Fill in required fields
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Check loading state
    await expect(page.getByText('Creating Account...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Creating Account...' })).toBeDisabled();
  });

  test('should handle successful registration', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/v1/users/', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123e4567-e89b-12d3-a456-426614174000',
          member_id: '123456789012',
          formatted_member_id: '1234-5678-9012',
        }),
      });
    });

    // Fill in required fields
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Should navigate to profile page
    await expect(page).toHaveURL(/\/profile\/123e4567-e89b-12d3-a456-426614174000/);
  });

  test('should handle registration errors', async ({ page }) => {
    // Mock error API response
    await page.route('**/api/v1/users/', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email already exists' }),
      });
    });

    // Fill in required fields
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Should show error message
    await expect(page.getByText('Email already exists')).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/users/', async route => {
      await route.abort('Failed');
    });

    // Fill in required fields
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Should show network error message
    await expect(page.getByText('Network error. Please check your connection.')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that form is still accessible
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Nickname')).toBeVisible();
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    
    // Check that form is usable on mobile
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    
    // Form should be functional
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should handle form with all optional fields', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/v1/users/', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123e4567-e89b-12d3-a456-426614174000',
          member_id: '123456789012',
          formatted_member_id: '1234-5678-9012',
        }),
      });
    });

    // Fill in all fields
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Nickname').fill('testuser');
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Middle Name').fill('Michael');
    await page.getByLabel('Last Name').fill('Doe');
    await page.getByLabel('Phone Number').fill('+1234567890');
    await page.getByLabel('Birth Date').fill('1990-01-01');
    await page.getByLabel('Country').selectOption('US');
    await page.getByLabel('Timezone').selectOption('America/New_York');
    await page.getByLabel('Bio').fill('This is a test bio');
    await page.getByLabel('Preferred Language').selectOption('en');
    await page.getByLabel('Preferred Locale').selectOption('en-us');
    
    // Check name preview
    await expect(page.getByText('John Michael Doe')).toBeVisible();
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Should navigate to profile page
    await expect(page).toHaveURL(/\/profile\/123e4567-e89b-12d3-a456-426614174000/);
  });
});
