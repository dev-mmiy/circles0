/**
 * User Profile Validation Utilities
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate nickname
 * - Required
 * - Length: 2-50 characters
 * - Alphanumeric, underscore, hyphen only
 */
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, error: 'ニックネームは必須です' };
  }

  if (nickname.length < 2) {
    return { valid: false, error: 'ニックネームは2文字以上である必要があります' };
  }

  if (nickname.length > 50) {
    return { valid: false, error: 'ニックネームは50文字以下である必要があります' };
  }

  // Allow alphanumeric, underscore, hyphen, and Japanese characters
  const validPattern = /^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
  if (!validPattern.test(nickname)) {
    return {
      valid: false,
      error: 'ニックネームは英数字、アンダースコア、ハイフン、日本語のみ使用できます',
    };
  }

  return { valid: true };
}

/**
 * Validate username (optional)
 * - Length: 3-30 characters
 * - Alphanumeric, underscore, hyphen only
 * - Must start with letter or number
 */
export function validateUsername(username?: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  if (username.length < 3) {
    return { valid: false, error: 'ユーザー名は3文字以上である必要があります' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'ユーザー名は30文字以下である必要があります' };
  }

  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_\-]*$/;
  if (!validPattern.test(username)) {
    return {
      valid: false,
      error: 'ユーザー名は英数字で始まり、英数字、アンダースコア、ハイフンのみ使用できます',
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'メールアドレスは必須です' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: '有効なメールアドレスを入力してください' };
  }

  return { valid: true };
}

/**
 * Validate phone number (optional)
 * - Allow various formats (with/without country code, with/without dashes)
 */
export function validatePhone(phone?: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  // Remove all non-digit characters except +
  const digitsOnly = phone.replace(/[^\d+]/g, '');

  if (digitsOnly.length < 10) {
    return { valid: false, error: '電話番号は10桁以上である必要があります' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: '電話番号は15桁以下である必要があります' };
  }

  return { valid: true };
}

/**
 * Validate bio (optional)
 * - Max length: 500 characters
 */
export function validateBio(bio?: string): { valid: boolean; error?: string } {
  if (!bio || bio.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  if (bio.length > 500) {
    return { valid: false, error: '自己紹介は500文字以下である必要があります' };
  }

  return { valid: true };
}

/**
 * Validate date of birth
 * - Must be a valid date
 * - Must be in the past
 * - User must be at least 13 years old
 */
export function validateDateOfBirth(dateOfBirth?: string): { valid: boolean; error?: string } {
  if (!dateOfBirth || dateOfBirth.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  const date = new Date(dateOfBirth);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return { valid: false, error: '有効な日付を入力してください' };
  }

  // Check if in the past
  if (date >= new Date()) {
    return { valid: false, error: '生年月日は過去の日付である必要があります' };
  }

  // Check if at least 13 years old
  const thirteenYearsAgo = new Date();
  thirteenYearsAgo.setFullYear(thirteenYearsAgo.getFullYear() - 13);

  if (date > thirteenYearsAgo) {
    return { valid: false, error: '13歳以上である必要があります' };
  }

  return { valid: true };
}

/**
 * Validate entire user profile update
 */
export function validateUserProfileUpdate(data: {
  nickname?: string;
  username?: string;
  bio?: string;
  phone?: string;
  date_of_birth?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate nickname (required)
  if (data.nickname !== undefined) {
    const nicknameResult = validateNickname(data.nickname);
    if (!nicknameResult.valid && nicknameResult.error) {
      errors.nickname = nicknameResult.error;
    }
  }

  // Validate username (optional)
  if (data.username !== undefined) {
    const usernameResult = validateUsername(data.username);
    if (!usernameResult.valid && usernameResult.error) {
      errors.username = usernameResult.error;
    }
  }

  // Validate bio (optional)
  if (data.bio !== undefined) {
    const bioResult = validateBio(data.bio);
    if (!bioResult.valid && bioResult.error) {
      errors.bio = bioResult.error;
    }
  }

  // Validate phone (optional)
  if (data.phone !== undefined) {
    const phoneResult = validatePhone(data.phone);
    if (!phoneResult.valid && phoneResult.error) {
      errors.phone = phoneResult.error;
    }
  }

  // Validate date of birth (optional)
  if (data.date_of_birth !== undefined) {
    const dobResult = validateDateOfBirth(data.date_of_birth);
    if (!dobResult.valid && dobResult.error) {
      errors.date_of_birth = dobResult.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
