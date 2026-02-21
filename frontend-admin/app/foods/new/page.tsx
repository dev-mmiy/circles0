'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFoodApi } from '@/lib/api/foods';
import FoodForm from '@/components/FoodForm';

export default function NewFoodPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            await adminFoodApi.createFood(data);
            router.push('/foods');
        } catch (error) {
            console.error(error);
            alert('保存に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">新規食材登録</h1>
            <FoodForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
    );
}
