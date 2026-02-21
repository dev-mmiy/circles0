import { apiClient } from './client';

export interface FoodNutrition {
    id?: string;
    unit: string;
    base_amount: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    potassium?: number;
    phosphorus?: number;
}

export interface Food {
    id: string;
    name: string;
    name_kana?: string;
    search_keywords?: string;
    category?: string;
    description?: string;
    user_id?: string;
    is_deleted: boolean;
    nutrition: FoodNutrition[];
    created_at: string;
    updated_at: string;
}

export interface FoodCreate {
    name: string;
    name_kana?: string;
    search_keywords?: string;
    category?: string;
    description?: string;
    nutrition_list: Omit<FoodNutrition, 'id'>[];
}

export interface FoodUpdate {
    name?: string;
    name_kana?: string;
    search_keywords?: string;
    category?: string;
    description?: string;
    nutrition_list?: Omit<FoodNutrition, 'id'>[];
}

export const adminFoodApi = {
    getFoods: (params?: {
        skip?: number;
        limit?: number;
        q?: string;
        include_deleted?: boolean;
    }) => apiClient.get<Food[]>('/api/v1/admin/foods', { params }),

    getFood: (id: string) => apiClient.get<Food>(`/api/v1/admin/foods/${id}`),

    createFood: (data: FoodCreate) => apiClient.post<Food>('/api/v1/admin/foods', data),

    updateFood: (id: string, data: FoodUpdate) =>
        apiClient.put<Food>(`/api/v1/admin/foods/${id}`, data),

    deleteFood: (id: string) => apiClient.delete<Food>(`/api/v1/admin/foods/${id}`),

    restoreFood: (id: string) => apiClient.post<Food>(`/api/v1/admin/foods/${id}/restore`),
};
