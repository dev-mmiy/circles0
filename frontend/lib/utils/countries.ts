/**
 * Country codes and names based on ISO 3166-1 alpha-2
 * Common countries list for user profile selection
 */

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  nameEn: string; // English name
  nameJa: string; // Japanese name
}

export const COUNTRIES: Country[] = [
  { code: 'JP', nameEn: 'Japan', nameJa: '日本' },
  { code: 'US', nameEn: 'United States', nameJa: 'アメリカ合衆国' },
  { code: 'GB', nameEn: 'United Kingdom', nameJa: 'イギリス' },
  { code: 'CA', nameEn: 'Canada', nameJa: 'カナダ' },
  { code: 'AU', nameEn: 'Australia', nameJa: 'オーストラリア' },
  { code: 'DE', nameEn: 'Germany', nameJa: 'ドイツ' },
  { code: 'FR', nameEn: 'France', nameJa: 'フランス' },
  { code: 'IT', nameEn: 'Italy', nameJa: 'イタリア' },
  { code: 'ES', nameEn: 'Spain', nameJa: 'スペイン' },
  { code: 'NL', nameEn: 'Netherlands', nameJa: 'オランダ' },
  { code: 'BE', nameEn: 'Belgium', nameJa: 'ベルギー' },
  { code: 'CH', nameEn: 'Switzerland', nameJa: 'スイス' },
  { code: 'AT', nameEn: 'Austria', nameJa: 'オーストリア' },
  { code: 'SE', nameEn: 'Sweden', nameJa: 'スウェーデン' },
  { code: 'NO', nameEn: 'Norway', nameJa: 'ノルウェー' },
  { code: 'DK', nameEn: 'Denmark', nameJa: 'デンマーク' },
  { code: 'FI', nameEn: 'Finland', nameJa: 'フィンランド' },
  { code: 'PL', nameEn: 'Poland', nameJa: 'ポーランド' },
  { code: 'CZ', nameEn: 'Czech Republic', nameJa: 'チェコ' },
  { code: 'IE', nameEn: 'Ireland', nameJa: 'アイルランド' },
  { code: 'PT', nameEn: 'Portugal', nameJa: 'ポルトガル' },
  { code: 'GR', nameEn: 'Greece', nameJa: 'ギリシャ' },
  { code: 'RU', nameEn: 'Russia', nameJa: 'ロシア' },
  { code: 'CN', nameEn: 'China', nameJa: '中国' },
  { code: 'KR', nameEn: 'South Korea', nameJa: '韓国' },
  { code: 'TW', nameEn: 'Taiwan', nameJa: '台湾' },
  { code: 'HK', nameEn: 'Hong Kong', nameJa: '香港' },
  { code: 'SG', nameEn: 'Singapore', nameJa: 'シンガポール' },
  { code: 'MY', nameEn: 'Malaysia', nameJa: 'マレーシア' },
  { code: 'TH', nameEn: 'Thailand', nameJa: 'タイ' },
  { code: 'ID', nameEn: 'Indonesia', nameJa: 'インドネシア' },
  { code: 'PH', nameEn: 'Philippines', nameJa: 'フィリピン' },
  { code: 'VN', nameEn: 'Vietnam', nameJa: 'ベトナム' },
  { code: 'IN', nameEn: 'India', nameJa: 'インド' },
  { code: 'PK', nameEn: 'Pakistan', nameJa: 'パキスタン' },
  { code: 'BD', nameEn: 'Bangladesh', nameJa: 'バングラデシュ' },
  { code: 'BR', nameEn: 'Brazil', nameJa: 'ブラジル' },
  { code: 'MX', nameEn: 'Mexico', nameJa: 'メキシコ' },
  { code: 'AR', nameEn: 'Argentina', nameJa: 'アルゼンチン' },
  { code: 'CL', nameEn: 'Chile', nameJa: 'チリ' },
  { code: 'CO', nameEn: 'Colombia', nameJa: 'コロンビア' },
  { code: 'PE', nameEn: 'Peru', nameJa: 'ペルー' },
  { code: 'ZA', nameEn: 'South Africa', nameJa: '南アフリカ' },
  { code: 'EG', nameEn: 'Egypt', nameJa: 'エジプト' },
  { code: 'NG', nameEn: 'Nigeria', nameJa: 'ナイジェリア' },
  { code: 'KE', nameEn: 'Kenya', nameJa: 'ケニア' },
  { code: 'IL', nameEn: 'Israel', nameJa: 'イスラエル' },
  { code: 'TR', nameEn: 'Turkey', nameJa: 'トルコ' },
  { code: 'SA', nameEn: 'Saudi Arabia', nameJa: 'サウジアラビア' },
  { code: 'AE', nameEn: 'United Arab Emirates', nameJa: 'アラブ首長国連邦' },
  { code: 'NZ', nameEn: 'New Zealand', nameJa: 'ニュージーランド' },
];

/**
 * Get country name based on locale
 */
export function getCountryName(countryCode: string, locale: string = 'ja'): string {
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country) return countryCode;
  
  return locale === 'ja' ? country.nameJa : country.nameEn;
}

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

