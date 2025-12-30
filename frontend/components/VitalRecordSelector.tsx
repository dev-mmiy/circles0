'use client';

import { Activity, Droplet, Heart, Scale, Thermometer } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type VitalType = 'blood_pressure_heart_rate' | 'temperature' | 'weight_body_fat' | 'blood_glucose' | 'spo2';

interface VitalRecordSelectorProps {
  onSelect: (type: VitalType) => void;
}

export default function VitalRecordSelector({ onSelect }: VitalRecordSelectorProps) {
  const t = useTranslations('daily');

  const vitals: Array<{
    type: VitalType;
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
  }> = [
    {
      type: 'blood_pressure_heart_rate',
      icon: <Activity className="w-6 h-6" />,
      label: t('addBloodPressureHeartRate') || '血圧・心拍数',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    },
    {
      type: 'temperature',
      icon: <Thermometer className="w-6 h-6" />,
      label: t('addTemperature') || '体温',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
    },
    {
      type: 'weight_body_fat',
      icon: <Scale className="w-6 h-6" />,
      label: t('addWeightBodyFat') || '体重・体脂肪率',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30',
    },
    {
      type: 'blood_glucose',
      icon: <Droplet className="w-6 h-6" />,
      label: t('addBloodGlucose') || '血糖値',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30',
    },
    {
      type: 'spo2',
      icon: <Heart className="w-6 h-6" />,
      label: t('addSpO2') || '血中酸素濃度',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {vitals.map((vital) => (
        <button
          key={vital.type}
          onClick={() => onSelect(vital.type)}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 border-transparent transition-all ${vital.bgColor} ${vital.color} hover:border-current`}
        >
          {vital.icon}
          <span className="mt-2 text-xs font-medium text-center">{vital.label}</span>
        </button>
      ))}
    </div>
  );
}

