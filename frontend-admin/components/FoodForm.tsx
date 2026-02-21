'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Food, FoodCreate, FoodUpdate, FoodNutrition } from '@/lib/api/foods';

interface FoodFormProps {
    initialData?: Food;
    onSubmit: (data: FoodCreate | FoodUpdate) => Promise<void>;
    isSubmitting?: boolean;
}

export default function FoodForm({ initialData, onSubmit, isSubmitting = false }: FoodFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<FoodCreate>({
        name: initialData?.name || '',
        name_kana: initialData?.name_kana || '',
        category: initialData?.category || '',
        description: initialData?.description || '',
        search_keywords: initialData?.search_keywords || '',
        nutrition_list: initialData?.nutrition.map(n => ({
            unit: n.unit,
            base_amount: n.base_amount,
            calories: n.calories,
            protein: n.protein,
            carbs: n.carbs,
            fat: n.fat,
            fiber: n.fiber,
            sodium: n.sodium,
            potassium: n.potassium,
            phosphorus: n.phosphorus,
        })) || [{ unit: '100g', base_amount: 100 }],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNutritionChange = (index: number, field: keyof Omit<FoodNutrition, 'id'>, value: string | number) => {
        const newNutrition = [...formData.nutrition_list];
        newNutrition[index] = { ...newNutrition[index], [field]: value };
        setFormData(prev => ({ ...prev, nutrition_list: newNutrition }));
    };

    const addNutrition = () => {
        setFormData(prev => ({
            ...prev,
            nutrition_list: [...prev.nutrition_list, { unit: '', base_amount: 1 }],
        }));
    };

    const removeNutrition = (index: number) => {
        if (formData.nutrition_list.length === 1) return;
        const newNutrition = [...formData.nutrition_list];
        newNutrition.splice(index, 1);
        setFormData(prev => ({ ...prev, nutrition_list: newNutrition }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">名前</label>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">カナ (読み仮名)</label>
                    <input
                        name="name_kana"
                        value={formData.name_kana || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
                    <input
                        name="category"
                        value={formData.category || ''}
                        onChange={handleChange}
                        placeholder="例: 穀物, 野菜"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">検索キーワード</label>
                    <input
                        name="search_keywords"
                        value={formData.search_keywords || ''}
                        onChange={handleChange}
                        placeholder="スペース区切り"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">説明</label>
                <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">栄養素 / 単位設定</h3>
                    <button
                        type="button"
                        onClick={addNutrition}
                        className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                    >
                        + 単位を追加
                    </button>
                </div>

                {formData.nutrition_list.map((nut, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
                        <div className="flex justify-between mb-2">
                            <span className="font-medium text-sm text-gray-500">設定 #{idx + 1}</span>
                            {formData.nutrition_list.length > 1 && (
                                <button type="button" onClick={() => removeNutrition(idx)} className="text-red-500 text-sm hover:text-red-700">削除</button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500">単位名 (例: 100g, 1個)</label>
                                <input
                                    value={nut.unit}
                                    onChange={e => handleNutritionChange(idx, 'unit', e.target.value)}
                                    placeholder="100g"
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">基準量 (数値)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.base_amount}
                                    onChange={e => handleNutritionChange(idx, 'base_amount', parseFloat(e.target.value))}
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">カロリー (kcal)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.calories || ''}
                                    onChange={e => handleNutritionChange(idx, 'calories', parseFloat(e.target.value))}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">タンパク質 (g)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.protein || ''}
                                    onChange={e => handleNutritionChange(idx, 'protein', parseFloat(e.target.value))}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">脂質 (g)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.fat || ''}
                                    onChange={e => handleNutritionChange(idx, 'fat', parseFloat(e.target.value))}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">炭水化物 (g)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.carbs || ''}
                                    onChange={e => handleNutritionChange(idx, 'carbs', parseFloat(e.target.value))}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">塩分 (mg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nut.sodium || ''}
                                    onChange={e => handleNutritionChange(idx, 'sodium', parseFloat(e.target.value))}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm p-1.5"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isSubmitting ? '保存中...' : '保存する'}
                </button>
            </div>
        </form>
    );
}
