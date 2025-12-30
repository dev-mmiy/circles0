/**
 * Type definitions for vital records
 */

import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { SpO2Record } from '@/lib/api/spo2Records';

export interface VitalRecordGroup {
  recordedAt: string;
  bloodPressure?: BloodPressureRecord;
  heartRate?: HeartRateRecord;
  temperature?: TemperatureRecord;
  weight?: WeightRecord;
  bodyFat?: BodyFatRecord;
  bloodGlucose?: BloodGlucoseRecord;
  spo2?: SpO2Record;
}

