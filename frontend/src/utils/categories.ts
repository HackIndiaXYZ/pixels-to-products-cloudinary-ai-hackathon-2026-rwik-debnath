export interface CategoryMeta {
  id: string;
  label: string;
  shortLabel?: string;
  badgeStyle: string;
  dotColor: string;
  textColor?: string;
  color: string;
  isCustom?: boolean;
}

export const COLOR_PALETTE = [
  { name: 'Rose', color: '#e11d48', dotColor: 'bg-rose-500', badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/80' },
  { name: 'Amber', color: '#d97706', dotColor: 'bg-amber-500', badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  { name: 'Emerald', color: '#059669', dotColor: 'bg-emerald-500', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  { name: 'Blue', color: '#2563eb', dotColor: 'bg-blue-500', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  { name: 'Violet', color: '#7c3aed', dotColor: 'bg-purple-500', badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/80' },
  { name: 'Slate', color: '#64748b', dotColor: 'bg-slate-500', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200/80' },
];

export const FIXED_BEATS: Record<string, CategoryMeta> = {
  breaking_news: {
    id: 'breaking_news',
    label: 'Breaking News',
    shortLabel: 'Breaking',
    textColor: 'text-rose-700',
    badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dotColor: 'bg-rose-500',
    color: '#e11d48',
  },
  public_safety: {
    id: 'public_safety',
    label: 'Public Safety',
    shortLabel: 'Safety',
    textColor: 'text-amber-800',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotColor: 'bg-amber-500',
    color: '#d97706',
  },
  severe_weather: {
    id: 'severe_weather',
    label: 'Severe Weather',
    shortLabel: 'Weather',
    textColor: 'text-sky-700',
    badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dotColor: 'bg-sky-500',
    color: '#0284c7',
  },
  politics_civic: {
    id: 'politics_civic',
    label: 'Politics & Civic',
    shortLabel: 'Politics',
    textColor: 'text-purple-700',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dotColor: 'bg-purple-500',
    color: '#7c3aed',
  },
  transit: {
    id: 'transit',
    label: 'Transit & Infrastructure',
    shortLabel: 'Transit',
    textColor: 'text-blue-700',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dotColor: 'bg-blue-500',
    color: '#2563eb',
  },
  metro_local: {
    id: 'metro_local',
    label: 'Metro & Local',
    shortLabel: 'Metro',
    textColor: 'text-emerald-700',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotColor: 'bg-emerald-500',
    color: '#059669',
  },
  uncategorized: {
    id: 'uncategorized',
    label: 'General Wire',
    shortLabel: 'Wire',
    textColor: 'text-slate-600',
    badgeStyle: 'bg-slate-100 text-slate-600 border-slate-200/80',
    dotColor: 'bg-slate-400',
    color: '#64748b',
  },
};

export const DEFAULT_CATEGORIES = FIXED_BEATS;
export const CATEGORIES = FIXED_BEATS;
export const CATEGORY_LIST = Object.values(FIXED_BEATS);

// Legacy aliases mapping to modern fixed news desks
const BEAT_ALIASES: Record<string, string> = {
  breaking: 'breaking_news',
  breaking_news: 'breaking_news',
  wildfire: 'public_safety',
  safety: 'public_safety',
  protest: 'politics_civic',
  traffic: 'transit',
  weather: 'severe_weather',
  severe_weather: 'severe_weather',
  politics: 'politics_civic',
  civic: 'politics_civic',
  metro: 'metro_local',
  local: 'metro_local',
  general: 'uncategorized',
  general_wire: 'uncategorized',
  wire: 'uncategorized',
};

export function getStoredCategories(): CategoryMeta[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('presswire_custom_categories_v2');
      localStorage.removeItem('presswire_custom_categories');
    } catch {
      // Ignore storage errors
    }
  }
  return CATEGORY_LIST;
}

export function saveStoredCategories(_categories: CategoryMeta[]): void {
  // No-op: desks are fixed and standardized
}

export function getCategoryMeta(type?: string, _list?: CategoryMeta[]): CategoryMeta {
  if (!type || !type.trim()) {
    return FIXED_BEATS['uncategorized'];
  }
  const key = type.toLowerCase().trim();

  // 1. Direct match by id
  if (FIXED_BEATS[key]) {
    return FIXED_BEATS[key];
  }

  // 2. Alias match (e.g. wildfire -> public_safety, protest -> politics_civic)
  if (BEAT_ALIASES[key] && FIXED_BEATS[BEAT_ALIASES[key]]) {
    return FIXED_BEATS[BEAT_ALIASES[key]];
  }

  // 3. Match by exact label
  const found = CATEGORY_LIST.find((c) => c.label.toLowerCase() === key);
  if (found) return found;

  // Fallback to General Wire if unassigned or unknown
  return FIXED_BEATS['uncategorized'];
}
