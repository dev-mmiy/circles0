/**
 * API client for meal records.
 */

import { debugLog } from '@/lib/debugLog';
import { getApiBaseUrl } from '@/lib/apiClient';

const apiClient = getApiBaseUrl();

export interface FoodItem {
  name: string;
  amount?: number;
  unit?: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods?: FoodItem[];
  nutrition?: NutritionInfo;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMealRecordData {
  recorded_at: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods?: FoodItem[];
  nutrition?: NutritionInfo;
  notes?: string;
}

export interface UpdateMealRecordData {
  recorded_at?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods?: FoodItem[];
  nutrition?: NutritionInfo;
  notes?: string;
}

/**
 * Get meal records for the current user.
 */
export async function getMealRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string
): Promise<MealRecord[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  const url = `${apiClient}/api/v1/meal-records?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch meal records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getMealRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific meal record by ID.
 */
export async function getMealRecord(
  recordId: string,
  accessToken: string
): Promise<MealRecord> {
  const url = `${apiClient}/api/v1/meal-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch meal record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getMealRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new meal record.
 */
export async function createMealRecord(
  data: CreateMealRecordData,
  accessToken: string
): Promise<MealRecord> {
  const url = `${apiClient}/api/v1/meal-records`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to create meal record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createMealRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a meal record.
 */
export async function updateMealRecord(
  recordId: string,
  data: UpdateMealRecordData,
  accessToken: string
): Promise<MealRecord> {
  const url = `${apiClient}/api/v1/meal-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to update meal record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateMealRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a meal record.
 */
export async function deleteMealRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/meal-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete meal record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteMealRecord] Error:', error);
    throw error;
  }
}

