export interface CategoryMeta {
  id: string;
  label: string;
  badgeStyle: string;
  dotColor: string;
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
  public_safety: {
    id: 'public_safety',
    label: 'Public Safety',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotColor: 'bg-amber-500',
    color: '#d97706',
  },
  severe_weather: {
    id: 'severe_weather',
    label: 'Severe Weather',
    badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dotColor: 'bg-sky-500',
    color: '#0284c7',
  },
  politics_civic: {
    id: 'politics_civic',
    label: 'Politics & Civic',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dotColor: 'bg-purple-500',
    color: '#7c3aed',
  },
  transit: {
    id: 'transit',
    label: 'Transit & Infrastructure',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dotColor: 'bg-blue-500',
    color: '#2563eb',
  },
  metro_local: {
    id: 'metro_local',
    label: 'Metro & Local',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotColor: 'bg-emerald-500',
    color: '#059669',
  },
  uncategorized: {
    id: 'uncategorized',
    label: 'General Wire',
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
  breaking_news: 'politics_civic',
  wildfire: 'public_safety',
  protest: 'politics_civic',
  traffic: 'transit',
  weather: 'severe_weather',
  politics: 'politics_civic',
  metro: 'metro_local',
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

  return {
    id: key,
    label: type,
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dotColor: 'bg-slate-400',
    color: '#64748b',
  };
}
