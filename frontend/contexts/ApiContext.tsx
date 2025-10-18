/**
 * API Context
 * Provides API service through React Context for Dependency Injection
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ApiService } from '../lib/api-service';
import { ApiConfig } from '../lib/api-config';

interface ApiContextType {
  apiService: ApiService;
  setApiService: (service: ApiService) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
  apiService?: ApiService;
}

export function ApiProvider({ children, apiService: customApiService }: ApiProviderProps) {
  const [apiService, setApiService] = React.useState<ApiService>(
    customApiService || new ApiService()
  );

  const value: ApiContextType = {
    apiService,
    setApiService,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextType {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}

// Hook for easy access to API service
export function useApiService(): ApiService {
  const { apiService } = useApi();
  return apiService;
}
