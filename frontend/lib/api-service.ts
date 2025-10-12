/**
 * API Service
 * Handles all API calls with proper error handling and environment-aware URLs
 */

import { apiConfig, ApiConfig } from './api-config';

export interface NameDisplayOrder {
  id: number;
  order_code: string;
  display_name: string;
  format_template: string;
  description: string;
  is_active: boolean;
}

export interface LocaleNameFormat {
  id: number;
  locale: string;
  default_order_code: string;
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  nickname: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  birth_date?: string;
  country_code?: string;
  timezone?: string;
  display_name?: string;
  bio?: string;
  preferred_language?: string;
  preferred_locale?: string;
  name_display_order?: string;
  custom_name_format?: string;
  idp_id?: string;
  idp_provider?: string;
}

export interface UserResponse {
  id: string;
  member_id: string;
  email: string;
  nickname: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  birth_date?: string;
  country_code?: string;
  timezone?: string;
  display_name?: string;
  bio?: string;
  preferred_language?: string;
  preferred_locale?: string;
  name_display_order?: string;
  custom_name_format?: string;
  full_name?: string;
  formatted_member_id?: string;
  created_at: string;
  updated_at: string;
}

export class ApiService {
  private config: ApiConfig;

  constructor(config?: ApiConfig) {
    this.config = config || apiConfig.getConfig();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      throw error;
    }
  }

  // Name Display Orders API
  async getNameDisplayOrders(): Promise<NameDisplayOrder[]> {
    return this.fetchWithErrorHandling<NameDisplayOrder[]>(
      this.config.endpoints.nameDisplayOrders
    );
  }

  // Locale Formats API
  async getLocaleFormats(): Promise<LocaleNameFormat[]> {
    return this.fetchWithErrorHandling<LocaleNameFormat[]>(
      this.config.endpoints.localeFormats
    );
  }

  // User Management API
  async createUser(userData: UserCreate): Promise<UserResponse> {
    return this.fetchWithErrorHandling<UserResponse>(
      this.config.endpoints.users,
      {
        method: 'POST',
        body: JSON.stringify(userData),
      }
    );
  }

  async getUser(userId: string): Promise<UserResponse> {
    return this.fetchWithErrorHandling<UserResponse>(
      `${this.config.endpoints.users}${userId}`
    );
  }

  // Health Check API
  async checkHealth(): Promise<{ status: string; environment: string }> {
    return this.fetchWithErrorHandling<{ status: string; environment: string }>(
      this.config.endpoints.health
    );
  }

  // Method to update config (useful for testing)
  setConfig(config: ApiConfig): void {
    this.config = config;
  }
}

// Export singleton instance
export const apiService = new ApiService();
