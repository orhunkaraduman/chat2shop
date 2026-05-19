export const colors = {
  canvas: '#F7F7F5',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F2F0',
  tile: '#F3F4F2',
  inkStrong: '#111318',
  inkSoft: '#2A3038',
  ink: '#171A1F',
  mutedSoft: '#6B7280',
  muted: '#6F7682',
  lineStrong: '#D2D7DE',
  border: '#E3E5E8',
  brand: '#111318',
  brandSoft: '#ECEFED',
  purple: '#111318',
  softPurple: '#ECEFED',
  commerce: '#B95F47',
  commerceSoft: '#F7E9E4',
  ai: '#0F766E',
  aiSoft: '#E7F4F1',
  softGreen: '#E7F4F1',
  green: '#0E7C66',
  trust: '#3E6F73',
  trustSoft: '#E8F1F2',
  tryOn: '#496A7A',
  tryOnSoft: '#EAF0F2',
  favorite: '#B95B6B',
  favoriteSoft: '#F8E9ED',
  danger: '#C94F3D',
  dangerSoft: '#FBE9E6',
  coral: '#C96545',
  info: '#2F5D8C',
  infoSoft: '#E9F0F8',
  blue: '#2F5D8C',
  credit: '#B8892E',
  creditSoft: '#FBF3DF',
  reward: '#B8892E',
  rewardSoft: '#FBF3DF',
  warningStrong: '#B8892E',
  yellow: '#D8A43D',
  warning: '#FFF7E6',
  warningBorder: '#E4C57D',
};

export type AccentTone = {
  accent: string;
  soft: string;
};

export function getCategoryAccent(category?: string): AccentTone {
  switch ((category ?? '').toLowerCase()) {
    case 'dress':
      return { accent: colors.favorite, soft: colors.favoriteSoft };
    case 'shoes':
    case 'bag':
    case 'accessory':
      return { accent: colors.reward, soft: colors.rewardSoft };
    case 'jacket':
    case 'shirt':
      return { accent: colors.trust, soft: colors.trustSoft };
    case 'pants':
      return { accent: colors.info, soft: colors.infoSoft };
    default:
      return { accent: colors.brand, soft: colors.brandSoft };
  }
}

export const spacing = {
  screen: 16,
  radius: 8,
};

export function formatPrice(value: number) {
  return `${value.toLocaleString('tr-TR')} TL`;
}
