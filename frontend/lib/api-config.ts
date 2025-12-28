/**
 * API Configuration Service
 * Manages API URLs for different environments using Dependency Injection pattern
 */

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    health: string;
    users: string;
    diseases: string;
  };
}

export class ApiConfigService {
  private static instance: ApiConfigService;
  private config: ApiConfig;

  private constructor() {
    this.config = this.determineConfig();
  }

  public static getInstance(): ApiConfigService {
    if (!ApiConfigService.instance) {
      ApiConfigService.instance = new ApiConfigService();
    }
    return ApiConfigService.instance;
  }

  private determineConfig(): ApiConfig {
    // Determine environment based on hostname and environment variables
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDev = hostname.includes('dev') || hostname.includes('staging');

    // Production URLs
    const productionApiUrl = 'https://api.lifry.com';
    const devApiUrl = 'https://disease-community-api-dev-508246122017.asia-northeast1.run.app';
    const localApiUrl = 'http://localhost:8000';

    let baseUrl: string;

    // Check for environment variable first
    if (typeof window !== 'undefined' && window.location.hostname) {
      if (isLocal) {
        baseUrl = localApiUrl;
      } else if (isDev) {
        baseUrl = devApiUrl;
      } else {
        baseUrl = productionApiUrl;
      }
    } else {
      // Fallback to local for SSR or when hostname is not available
      baseUrl = localApiUrl;
    }

    return {
      baseUrl,
      endpoints: {
        health: `${baseUrl}/health`,
        users: `${baseUrl}/api/v1/users/`,
        diseases: `${baseUrl}/api/v1/diseases/`,
      },
    };
  }

  public getConfig(): ApiConfig {
    return this.config;
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public getEndpoint(endpoint: keyof ApiConfig['endpoints']): string {
    return this.config.endpoints[endpoint];
  }

  // Method to update config (useful for testing)
  public setConfig(config: ApiConfig): void {
    this.config = config;
  }
}

// Export singleton instance
export const apiConfig = ApiConfigService.getInstance();
