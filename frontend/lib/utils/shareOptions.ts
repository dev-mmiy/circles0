/**
 * Share options configuration based on user's country
 * Different countries have different popular social media platforms
 */

export type ShareOptionType = 
  | 'copyUrl'
  | 'twitter'
  | 'facebook'
  | 'line'
  | 'kakaotalk'
  | 'wechat'
  | 'weibo'
  | 'message';

export interface ShareOption {
  type: ShareOptionType;
  order: number; // Display order (lower = first)
}

/**
 * Country-based share options configuration
 * Maps country codes to available share options
 */
const COUNTRY_SHARE_OPTIONS: Record<string, ShareOption[]> = {
  // Japan: LINE is very popular
  JP: [
    { type: 'copyUrl', order: 1 },
    { type: 'line', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'facebook', order: 4 },
    { type: 'message', order: 5 },
  ],
  
  // South Korea: KakaoTalk is dominant
  KR: [
    { type: 'copyUrl', order: 1 },
    { type: 'kakaotalk', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'facebook', order: 4 },
    { type: 'message', order: 5 },
  ],
  
  // China: WeChat and Weibo are popular
  CN: [
    { type: 'copyUrl', order: 1 },
    { type: 'wechat', order: 2 },
    { type: 'weibo', order: 3 },
    { type: 'message', order: 4 },
  ],
  
  // Taiwan: LINE and Facebook are popular
  TW: [
    { type: 'copyUrl', order: 1 },
    { type: 'line', order: 2 },
    { type: 'facebook', order: 3 },
    { type: 'twitter', order: 4 },
    { type: 'message', order: 5 },
  ],
  
  // Hong Kong: Facebook and WhatsApp (via message) are popular
  HK: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  
  // Thailand, Indonesia, Philippines: LINE is popular
  TH: [
    { type: 'copyUrl', order: 1 },
    { type: 'line', order: 2 },
    { type: 'facebook', order: 3 },
    { type: 'twitter', order: 4 },
    { type: 'message', order: 5 },
  ],
  ID: [
    { type: 'copyUrl', order: 1 },
    { type: 'line', order: 2 },
    { type: 'facebook', order: 3 },
    { type: 'twitter', order: 4 },
    { type: 'message', order: 5 },
  ],
  PH: [
    { type: 'copyUrl', order: 1 },
    { type: 'line', order: 2 },
    { type: 'facebook', order: 3 },
    { type: 'twitter', order: 4 },
    { type: 'message', order: 5 },
  ],
  
  // Singapore, Malaysia: Facebook is popular
  SG: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'line', order: 4 },
    { type: 'message', order: 5 },
  ],
  MY: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  
  // United States, Canada: Facebook and Twitter are popular
  US: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  CA: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  
  // Europe: Facebook and Twitter are popular
  GB: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  DE: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  FR: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  IT: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  ES: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
  
  // Default (for countries not listed above)
  DEFAULT: [
    { type: 'copyUrl', order: 1 },
    { type: 'facebook', order: 2 },
    { type: 'twitter', order: 3 },
    { type: 'message', order: 4 },
  ],
};

/**
 * Get share options for a specific country
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'JP', 'US')
 * @returns Array of share options sorted by order
 */
export function getShareOptionsForCountry(countryCode?: string | null): ShareOption[] {
  if (!countryCode) {
    return COUNTRY_SHARE_OPTIONS.DEFAULT;
  }
  
  const normalizedCode = countryCode.toUpperCase();
  const options = COUNTRY_SHARE_OPTIONS[normalizedCode] || COUNTRY_SHARE_OPTIONS.DEFAULT;
  
  // Sort by order
  return [...options].sort((a, b) => a.order - b.order);
}

/**
 * Check if a share option is available for a country
 */
export function hasShareOption(countryCode: string | null | undefined, optionType: ShareOptionType): boolean {
  const options = getShareOptionsForCountry(countryCode);
  return options.some(opt => opt.type === optionType);
}

