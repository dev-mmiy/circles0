'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminFoodApi, Food } from '@/lib/api/foods'; // Ensure correct import path
import FoodForm from '@/components/FoodForm';

export default function EditFoodPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [food, setFood] = useState<Food | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchFood = async () => {
            try {
                const res = await adminFoodApi.getFood(params.id);
                setFood(res.data);
            } catch (error) {
                console.error(error);
                alert('読み込みに失敗しました');
                router.push('/foods');
            } finally {
                setLoading(false);
            }
        };
        fetchFood();
    }, [params.id, router]);

    const handleSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            await adminFoodApi.updateFood(params.id, data);
            router.push('/foods');
        } catch (error) {
            console.error(error);
            alert('更新に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-6">読み込み中...</div>;
    if (!food) return <div className="p-6">食材が見つかりません</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">食材編集: {food.name}</h1>
            <FoodForm initialData={food} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
    );
}
