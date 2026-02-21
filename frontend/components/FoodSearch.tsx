import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import apiClient from '@/lib/api/client';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Food, Menu } from '@/types/food';

type FoodSearchProps = {
    onSelect: (item: Food | Menu, type: 'food' | 'menu') => void;
};

interface SearchResultListProps<T> {
    items: T[] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: any;
    emptyMessage: string;
    onSelect: (item: T) => void;
    getNutrition: (item: T) => { calories?: number; base_amount: number; unit: string } | null;
}

// Reusable List Item Component
const SearchResultList = <T extends Food | Menu>({
    items,
    isLoading,
    isError,
    error,
    emptyMessage,
    onSelect,
    getNutrition,
}: SearchResultListProps<T>) => {
    if (isLoading) {
        return <div className="text-center py-4 text-gray-500">Loading...</div>;
    }

    if (isError) {
        return (
            <div className="text-center py-4 text-red-500 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error loading data</span>
                </div>
                <span className="text-xs text-gray-400">{(error as any)?.message}</span>
            </div>
        );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return <div className="text-center py-4 text-gray-500">{emptyMessage}</div>;
    }

    return (
        <ul className="divide-y relative">
            {items.map((item) => {
                const nutrition = getNutrition(item);
                return (
                    <li
                        key={item.id}
                        className="py-2 px-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors duration-150"
                        onClick={() => onSelect(item)}
                    >
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                            {nutrition && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {nutrition.calories} kcal / {nutrition.base_amount}{nutrition.unit}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="p-1 rounded-full hover:bg-blue-100 text-blue-500 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(item);
                            }}
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

const FoodSearch: React.FC<FoodSearchProps> = ({ onSelect }) => {
    const t = useTranslations('postForm.healthRecord.mealForm');
    const { getAccessTokenSilently } = useAuth0();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [activeTab, setActiveTab] = useState<'foods' | 'menus'>('foods');

    // Generic fetch function
    const fetchItems = async <T,>(endpoint: string): Promise<T[]> => {
        const token = await getAccessTokenSilently();
        const response = await apiClient.get(endpoint, {
            params: { q: debouncedSearchTerm, limit: 10 },
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data as T[];
    };

    // Search Foods Query
    const {
        data: foods,
        isLoading: isLoadingFoods,
        isError: isErrorFoods,
        error: foodsError,
    } = useQuery({
        queryKey: ['foods', debouncedSearchTerm],
        queryFn: () => fetchItems<Food>('/api/v1/foods'),
        enabled: activeTab === 'foods',
        retry: 1,
    });

    // Search Menus Query
    const {
        data: menus,
        isLoading: isLoadingMenus,
        isError: isErrorMenus,
        error: menusError,
    } = useQuery({
        queryKey: ['menus', debouncedSearchTerm],
        queryFn: () => fetchItems<Menu>('/api/v1/menus'),
        enabled: activeTab === 'menus',
        retry: 1,
    });

    const handleSelect = (item: Food | Menu) => {
        onSelect(item, activeTab === 'foods' ? 'food' : 'menu');
        setSearchTerm(''); // Clear search after selection
    };

    // Helper to extract nutrition info safely
    const getNutritionInfo = (item: Food | Menu) => {
        if (!item.nutrition || item.nutrition.length === 0) return null;
        const n = item.nutrition[0];
        return { calories: n.calories, base_amount: n.base_amount, unit: n.unit };
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${activeTab === 'foods'
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    onClick={() => setActiveTab('foods')}
                    type="button"
                >
                    {t('foods', { defaultMessage: 'Foods' })}
                </button>
                <button
                    className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${activeTab === 'menus'
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    onClick={() => setActiveTab('menus')}
                    type="button"
                >
                    {t('menus', { defaultMessage: 'Menus' })}
                </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder={t('searchPlaceholder', { defaultMessage: 'Search by name...' })}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-shadow"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                        }
                    }}
                />
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {activeTab === 'foods' ? (
                    <SearchResultList
                        items={foods}
                        isLoading={isLoadingFoods}
                        isError={isErrorFoods}
                        error={foodsError}
                        emptyMessage={t('noResults', { defaultMessage: 'No foods found.' })}
                        onSelect={handleSelect}
                        getNutrition={getNutritionInfo}
                    />
                ) : (
                    <SearchResultList
                        items={menus}
                        isLoading={isLoadingMenus}
                        isError={isErrorMenus}
                        error={menusError}
                        emptyMessage={t('noResults', { defaultMessage: 'No menus found.' })}
                        onSelect={handleSelect}
                        getNutrition={getNutritionInfo}
                    />
                )}
            </div>
        </div>
    );
};

export default FoodSearch;
