/**
 * Disease Validation Utilities
 */

import { UserDiseaseCreate, UserDiseaseUpdate } from '@/lib/api/users';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate diagnosis date
 * - Must be a valid date
 * - Must be in the past
 */
export function validateDiagnosisDate(date?: string): { valid: boolean; error?: string } {
  if (!date || date.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  const diagnosisDate = new Date(date);

  // Check if valid date
  if (isNaN(diagnosisDate.getTime())) {
    return { valid: false, error: '有効な日付を入力してください' };
  }

  // Check if in the past or today
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (diagnosisDate > today) {
    return { valid: false, error: '診断日は現在または過去の日付である必要があります' };
  }

  return { valid: true };
}

/**
 * Validate severity level
 * - Must be between 1 and 5
 */
export function validateSeverityLevel(level?: number): { valid: boolean; error?: string } {
  if (level === undefined || level === null) {
    return { valid: true }; // Optional field
  }

  if (!Number.isInteger(level)) {
    return { valid: false, error: '重症度レベルは整数である必要があります' };
  }

  if (level < 1 || level > 5) {
    return { valid: false, error: '重症度レベルは1から5の間である必要があります' };
  }

  return { valid: true };
}

/**
 * Validate text field length
 */
export function validateTextLength(
  text?: string,
  maxLength: number = 1000,
  fieldName: string = 'テキスト'
): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  if (text.length > maxLength) {
    return { valid: false, error: `${fieldName}は${maxLength}文字以下である必要があります` };
  }

  return { valid: true };
}

/**
 * Validate doctor name
 */
export function validateDoctorName(name?: string): { valid: boolean; error?: string } {
  return validateTextLength(name, 200, '担当医名');
}

/**
 * Validate hospital name
 */
export function validateHospitalName(name?: string): { valid: boolean; error?: string } {
  return validateTextLength(name, 200, '医療機関名');
}

/**
 * Validate symptoms
 */
export function validateSymptoms(symptoms?: string): { valid: boolean; error?: string } {
  return validateTextLength(symptoms, 2000, '症状');
}

/**
 * Validate limitations
 */
export function validateLimitations(limitations?: string): { valid: boolean; error?: string } {
  return validateTextLength(limitations, 2000, '制限事項');
}

/**
 * Validate medications
 */
export function validateMedications(medications?: string): { valid: boolean; error?: string } {
  return validateTextLength(medications, 2000, '服薬情報');
}

/**
 * Validate notes
 */
export function validateNotes(notes?: string): { valid: boolean; error?: string } {
  return validateTextLength(notes, 2000, '備考');
}

/**
 * Validate disease create data
 */
export function validateUserDiseaseCreate(data: UserDiseaseCreate): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate disease_id (required)
  if (!data.disease_id) {
    errors.disease_id = '疾患を選択してください';
  }

  // Validate diagnosis date
  const dateResult = validateDiagnosisDate(data.diagnosis_date);
  if (!dateResult.valid && dateResult.error) {
    errors.diagnosis_date = dateResult.error;
  }

  // Validate severity level
  const severityResult = validateSeverityLevel(data.severity_level);
  if (!severityResult.valid && severityResult.error) {
    errors.severity_level = severityResult.error;
  }

  // Validate doctor name
  const doctorResult = validateDoctorName(data.diagnosis_doctor);
  if (!doctorResult.valid && doctorResult.error) {
    errors.diagnosis_doctor = doctorResult.error;
  }

  // Validate hospital name
  const hospitalResult = validateHospitalName(data.diagnosis_hospital);
  if (!hospitalResult.valid && hospitalResult.error) {
    errors.diagnosis_hospital = hospitalResult.error;
  }

  // Validate symptoms
  const symptomsResult = validateSymptoms(data.symptoms);
  if (!symptomsResult.valid && symptomsResult.error) {
    errors.symptoms = symptomsResult.error;
  }

  // Validate limitations
  const limitationsResult = validateLimitations(data.limitations);
  if (!limitationsResult.valid && limitationsResult.error) {
    errors.limitations = limitationsResult.error;
  }

  // Validate medications
  const medicationsResult = validateMedications(data.medications);
  if (!medicationsResult.valid && medicationsResult.error) {
    errors.medications = medicationsResult.error;
  }

  // Validate notes
  const notesResult = validateNotes(data.notes);
  if (!notesResult.valid && notesResult.error) {
    errors.notes = notesResult.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate disease update data
 */
export function validateUserDiseaseUpdate(data: UserDiseaseUpdate): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate diagnosis date
  if (data.diagnosis_date !== undefined) {
    const dateResult = validateDiagnosisDate(data.diagnosis_date);
    if (!dateResult.valid && dateResult.error) {
      errors.diagnosis_date = dateResult.error;
    }
  }

  // Validate severity level
  if (data.severity_level !== undefined) {
    const severityResult = validateSeverityLevel(data.severity_level);
    if (!severityResult.valid && severityResult.error) {
      errors.severity_level = severityResult.error;
    }
  }

  // Validate doctor name
  if (data.diagnosis_doctor !== undefined) {
    const doctorResult = validateDoctorName(data.diagnosis_doctor);
    if (!doctorResult.valid && doctorResult.error) {
      errors.diagnosis_doctor = doctorResult.error;
    }
  }

  // Validate hospital name
  if (data.diagnosis_hospital !== undefined) {
    const hospitalResult = validateHospitalName(data.diagnosis_hospital);
    if (!hospitalResult.valid && hospitalResult.error) {
      errors.diagnosis_hospital = hospitalResult.error;
    }
  }

  // Validate symptoms
  if (data.symptoms !== undefined) {
    const symptomsResult = validateSymptoms(data.symptoms);
    if (!symptomsResult.valid && symptomsResult.error) {
      errors.symptoms = symptomsResult.error;
    }
  }

  // Validate limitations
  if (data.limitations !== undefined) {
    const limitationsResult = validateLimitations(data.limitations);
    if (!limitationsResult.valid && limitationsResult.error) {
      errors.limitations = limitationsResult.error;
    }
  }

  // Validate medications
  if (data.medications !== undefined) {
    const medicationsResult = validateMedications(data.medications);
    if (!medicationsResult.valid && medicationsResult.error) {
      errors.medications = medicationsResult.error;
    }
  }

  // Validate notes
  if (data.notes !== undefined) {
    const notesResult = validateNotes(data.notes);
    if (!notesResult.valid && notesResult.error) {
      errors.notes = notesResult.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
