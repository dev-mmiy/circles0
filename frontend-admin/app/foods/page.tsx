'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminFoodApi, Food } from '@/lib/api/foods';

export default function FoodsPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchFoods = async () => {
        try {
            setLoading(true);
            // include_deleted: true to show all and manage them
            const res = await adminFoodApi.getFoods({ q: search, include_deleted: true });
            setFoods(res.data);
        } catch (error) {
            console.error(error);
            // alert('Failed to load foods'); // Suppress alert on initial load if auth fails quietly
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFoods();
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm('この食品を削除しますか？')) return;
        try {
            await adminFoodApi.deleteFood(id);
            fetchFoods();
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('この食品を復元しますか？')) return;
        try {
            await adminFoodApi.restoreFood(id);
            fetchFoods();
        } catch (e) {
            alert('復元に失敗しました');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">食材管理</h1>
                <Link
                    href="/foods/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    新規作成
                </Link>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="食材名、カナで検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カロリー (単位あたり)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {foods.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        食材が見つかりません
                                    </td>
                                </tr>
                            ) : (
                                foods.map((food) => (
                                    <tr key={food.id} className={`hover:bg-gray-50 transition-colors ${food.is_deleted ? 'bg-gray-50 opacity-60' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{food.name}</div>
                                            {food.name_kana && <div className="text-xs text-gray-500">{food.name_kana}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {food.category || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {food.nutrition.length > 0 ? (
                                                <span>
                                                    {food.nutrition[0].calories} kcal
                                                    <span className="text-xs text-gray-400 ml-1">
                                                        ({food.nutrition[0].unit} {food.nutrition[0].base_amount})
                                                    </span>
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {food.is_deleted ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    削除済
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    有効
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                            <Link
                                                href={`/foods/${food.id}`}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                編集
                                            </Link>
                                            {food.is_deleted ? (
                                                <button
                                                    onClick={() => handleRestore(food.id)}
                                                    className="text-green-600 hover:text-green-900 font-medium"
                                                >
                                                    復元
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(food.id)}
                                                    className="text-red-600 hover:text-red-900 font-medium"
                                                >
                                                    削除
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
