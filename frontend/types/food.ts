export interface FoodNutrition {
    unit: string;
    base_amount: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export interface Food {
    id: string;
    name: string;
    name_kana?: string;
    search_keywords?: string;
    category?: string;
    description?: string;
    nutrition: FoodNutrition[];
}

export interface MenuNutrition {
    unit: string;
    base_amount: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export interface Menu {
    id: string;
    name: string;
    description?: string;
    nutrition: MenuNutrition[];
}
