/**
 * API client for vital records.
 */

import { debugLog } from '@/lib/debugLog';
import { getApiBaseUrl } from '@/lib/apiClient';

const apiClient = getApiBaseUrl();

export interface VitalRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  body_fat_percentage?: number;
  blood_glucose?: number;
  blood_glucose_timing?: 'fasting' | 'postprandial';
  spo2?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVitalRecordData {
  recorded_at: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  body_fat_percentage?: number;
  blood_glucose?: number;
  blood_glucose_timing?: 'fasting' | 'postprandial';
  spo2?: number;
  notes?: string;
}

export interface UpdateVitalRecordData {
  recorded_at?: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  body_fat_percentage?: number;
  blood_glucose?: number;
  blood_glucose_timing?: 'fasting' | 'postprandial';
  spo2?: number;
  notes?: string;
}

/**
 * Get vital records for the current user.
 */
export async function getVitalRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string
): Promise<VitalRecord[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  const url = `${apiClient}/api/v1/vital-records?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch vital records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getVitalRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific vital record by ID.
 */
export async function getVitalRecord(
  recordId: string,
  accessToken: string
): Promise<VitalRecord> {
  const url = `${apiClient}/api/v1/vital-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch vital record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getVitalRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new vital record.
 */
export async function createVitalRecord(
  data: CreateVitalRecordData,
  accessToken: string
): Promise<VitalRecord> {
  const url = `${apiClient}/api/v1/vital-records`;
  
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
      const errorData = await response.json().catch(() => ({ detail: 'Failed to create vital record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createVitalRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a vital record.
 */
export async function updateVitalRecord(
  recordId: string,
  data: UpdateVitalRecordData,
  accessToken: string
): Promise<VitalRecord> {
  const url = `${apiClient}/api/v1/vital-records/${recordId}`;
  
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
      const errorData = await response.json().catch(() => ({ detail: 'Failed to update vital record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateVitalRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a vital record.
 */
export async function deleteVitalRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/vital-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete vital record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteVitalRecord] Error:', error);
    throw error;
  }
}

