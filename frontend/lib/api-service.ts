/**
 * API Service
 * Handles all API calls with proper error handling and environment-aware URLs
 */

import { apiConfig, ApiConfig } from './api-config';

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

  // Health Check API
  async checkHealth(): Promise<{ status: string; environment: string }> {
    return this.fetchWithErrorHandling<{ status: string; environment: string }>(
      this.config.endpoints.health
    );
  }

  // Get base URL
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  // Method to update config (useful for testing)
  setConfig(config: ApiConfig): void {
    this.config = config;
  }
}

// Export singleton instance
export const apiService = new ApiService();
