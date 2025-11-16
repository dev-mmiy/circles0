/**
 * Filter Settings Utility
 * Manages filter settings in localStorage for search components
 */

const USER_SEARCH_FILTER_KEY = 'user_search_filter_settings';
const DISEASE_SEARCH_FILTER_KEY = 'disease_search_filter_settings';

export interface UserSearchFilterSettings {
  memberId?: string;
  diseaseIds?: number[];
  sortBy?: 'created_at' | 'last_login_at' | 'nickname';
  sortOrder?: 'asc' | 'desc';
}

export interface DiseaseSearchFilterSettings {
  categoryIds?: number[];
  icdCode?: string;
  sortBy?: 'name' | 'disease_code' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get saved filter settings for user search
 */
export function getUserSearchFilterSettings(): UserSearchFilterSettings | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(USER_SEARCH_FILTER_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as UserSearchFilterSettings;
  } catch (error) {
    console.error('Failed to load user search filter settings:', error);
    return null;
  }
}

/**
 * Save filter settings for user search
 */
export function saveUserSearchFilterSettings(settings: UserSearchFilterSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Only save non-empty settings
    const filtered: UserSearchFilterSettings = {};
    if (settings.memberId?.trim()) filtered.memberId = settings.memberId.trim();
    if (settings.diseaseIds && settings.diseaseIds.length > 0) filtered.diseaseIds = settings.diseaseIds;
    if (settings.sortBy) filtered.sortBy = settings.sortBy;
    if (settings.sortOrder) filtered.sortOrder = settings.sortOrder;
    
    localStorage.setItem(USER_SEARCH_FILTER_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save user search filter settings:', error);
  }
}

/**
 * Clear filter settings for user search
 */
export function clearUserSearchFilterSettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_SEARCH_FILTER_KEY);
}

/**
 * Get saved filter settings for disease search
 */
export function getDiseaseSearchFilterSettings(): DiseaseSearchFilterSettings | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(DISEASE_SEARCH_FILTER_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as DiseaseSearchFilterSettings;
  } catch (error) {
    console.error('Failed to load disease search filter settings:', error);
    return null;
  }
}

/**
 * Save filter settings for disease search
 */
export function saveDiseaseSearchFilterSettings(settings: DiseaseSearchFilterSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Only save non-empty settings
    const filtered: DiseaseSearchFilterSettings = {};
    if (settings.categoryIds && settings.categoryIds.length > 0) filtered.categoryIds = settings.categoryIds;
    if (settings.icdCode?.trim()) filtered.icdCode = settings.icdCode.trim();
    if (settings.sortBy) filtered.sortBy = settings.sortBy;
    if (settings.sortOrder) filtered.sortOrder = settings.sortOrder;
    
    localStorage.setItem(DISEASE_SEARCH_FILTER_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save disease search filter settings:', error);
  }
}

/**
 * Clear filter settings for disease search
 */
export function clearDiseaseSearchFilterSettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISEASE_SEARCH_FILTER_KEY);
}


