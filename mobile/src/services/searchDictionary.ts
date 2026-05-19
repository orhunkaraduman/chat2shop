import type { Category, ModestyLevel, OccasionTag, Product, StyleProfile, StyleTag } from '@/types';

type VariantEntry<T extends string> = {
  canonical: T;
  variants: string[];
};

const CATEGORY_VARIANTS: Array<VariantEntry<Category>> = [
  { canonical: 'dress', variants: ['dress', 'elbise', 'elbisesi', 'elbiseler', 'midi dress', 'maxi dress'] },
  { canonical: 'shirt', variants: ['shirt', 'gomlek', 'gömlek', 'blouse', 'bluz'] },
  { canonical: 'pants', variants: ['pants', 'pantolon', 'trouser', 'trousers'] },
  { canonical: 'jacket', variants: ['jacket', 'ceket', 'blazer', 'coat', 'trench'] },
  { canonical: 'shoes', variants: ['shoes', 'shoe', 'ayakkabi', 'ayakkabı', 'sneaker', 'loafer', 'heel'] },
  { canonical: 'bag', variants: ['bag', 'canta', 'çanta', 'tote', 'shoulder bag'] },
  { canonical: 'accessory', variants: ['accessory', 'aksesuar', 'jewelry', 'takı', 'taki'] },
];

const OCCASION_VARIANTS: Array<VariantEntry<OccasionTag>> = [
  { canonical: 'graduation', variants: ['graduation', 'mezuniyet', 'mezun'] },
  { canonical: 'evening', variants: ['evening', 'aksam', 'akşam', 'gece', 'night out'] },
  { canonical: 'wedding guest', variants: ['wedding guest', 'wedding', 'dugun', 'düğün', 'davet', 'nişan', 'nisan'] },
  { canonical: 'office', variants: ['office', 'ofis', 'work', 'is', 'iş', 'professional'] },
  { canonical: 'daily', variants: ['daily', 'gunluk', 'günlük', 'everyday'] },
  { canonical: 'holiday', variants: ['holiday', 'tatil', 'vacation', 'resort'] },
  { canonical: 'summer', variants: ['summer', 'yaz', 'beach', 'sahil'] },
  { canonical: 'dinner', variants: ['dinner', 'yemek', 'aksam yemegi', 'akşam yemeği'] },
  { canonical: 'sport', variants: ['sport', 'spor', 'gym', 'training'] },
  { canonical: 'weekend', variants: ['weekend', 'hafta sonu', 'weekend brunch'] },
];

const STYLE_VARIANTS: Array<VariantEntry<StyleTag>> = [
  { canonical: 'minimal', variants: ['minimal', 'sade', 'clean'] },
  { canonical: 'elegant', variants: ['elegant', 'sik', 'şık', 'zarif', 'dressy'] },
  { canonical: 'classic', variants: ['classic', 'klasik', 'timeless'] },
  { canonical: 'smart casual', variants: ['smart casual', 'smart-casual', 'profesyonel', 'professional'] },
  { canonical: 'streetwear', variants: ['streetwear', 'street', 'sokak'] },
  { canonical: 'casual', variants: ['casual', 'rahat', 'laid back', 'laid-back'] },
  { canonical: 'sporty', variants: ['sporty', 'spor', 'athleisure'] },
  { canonical: 'modest', variants: ['modest', 'kapali', 'kapalı', 'covered'] },
  { canonical: 'bohemian', variants: ['bohemian', 'bohem'] },
  { canonical: 'vintage', variants: ['vintage', 'retro'] },
  { canonical: 'old money', variants: ['old money', 'quiet luxury'] },
  { canonical: 'clean girl', variants: ['clean girl', 'clean-girl'] },
];

const COLOR_VARIANTS: Array<VariantEntry<string>> = [
  { canonical: 'Siyah', variants: ['siyah', 'black', 'charcoal'] },
  { canonical: 'Beyaz', variants: ['beyaz', 'white', 'ivory'] },
  { canonical: 'Mavi', variants: ['mavi', 'blue', 'sky blue', 'gok mavisi', 'gök mavisi'] },
  { canonical: 'Lacivert', variants: ['lacivert', 'navy', 'navy blue'] },
  { canonical: 'Krem', variants: ['krem', 'cream', 'off white', 'off-white'] },
  { canonical: 'Bej', variants: ['bej', 'beige', 'camel'] },
  { canonical: 'Nude', variants: ['nude', 'ten', 'skin tone'] },
  { canonical: 'Gri', variants: ['gri', 'gray', 'grey'] },
  { canonical: 'Pembe', variants: ['pembe', 'pink'] },
  { canonical: 'Yeşil', variants: ['yesil', 'yeşil', 'green', 'olive'] },
  { canonical: 'Kahverengi', variants: ['kahverengi', 'brown', 'chocolate'] },
];

const FIT_VARIANTS: Array<VariantEntry<string>> = [
  { canonical: 'regular', variants: ['regular', 'normal', 'regular fit', 'normal kesim'] },
  { canonical: 'slim', variants: ['slim', 'slim fit', 'fitted', 'dar'] },
  { canonical: 'oversize', variants: ['oversize', 'oversized', 'bol', 'salaş', 'salas', 'relaxed'] },
];

const MODESTY_VARIANTS: Array<VariantEntry<ModestyLevel>> = [
  { canonical: 'low', variants: ['low', 'revealing', 'open'] },
  { canonical: 'medium', variants: ['medium', 'balanced', 'normal'] },
  { canonical: 'medium-high', variants: ['medium-high', 'not too revealing', 'covered enough'] },
  { canonical: 'high', variants: ['high', 'modest', 'closed', 'kapali', 'kapalı'] },
];

const WORD_NORMALIZATION_MAP: Record<string, string> = {
  gomlek: 'gömlek',
  ayakkabi: 'ayakkabı',
  canta: 'çanta',
  dugun: 'düğün',
  gunluk: 'günlük',
  kapali: 'kapalı',
  sik: 'şık',
  aksam: 'akşam',
  yesil: 'yeşil',
  salas: 'salaş',
};

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchText(value: string) {
  return normalizeSearchText(value)
    .split(/[^a-z0-9çğıöşü]+/i)
    .map((token) => WORD_NORMALIZATION_MAP[token] ?? token)
    .filter((token) => token.length >= 2);
}

export function extractVariantTokens(parts: Array<string | undefined>) {
  const normalizedParts = parts.filter(Boolean).map((part) => normalizeSearchText(part!));
  const baseTokens = Array.from(new Set(normalizedParts.flatMap((part) => tokenizeSearchText(part))));
  const expanded = new Set(baseTokens);
  const joined = normalizedParts.join(' ');

  [
    ...findEntriesInText(joined, CATEGORY_VARIANTS),
    ...findEntriesInText(joined, OCCASION_VARIANTS),
    ...findEntriesInText(joined, STYLE_VARIANTS),
  ].forEach((canonical) => expanded.add(normalizeSearchText(canonical)));

  const color = extractCanonicalColor(joined);
  if (color) expanded.add(normalizeSearchText(color));

  baseTokens.forEach((token) => {
    findMatchingVariantEntry(token, CATEGORY_VARIANTS)?.variants.forEach((variant) => expanded.add(normalizeSearchText(variant)));
    findMatchingVariantEntry(token, OCCASION_VARIANTS)?.variants.forEach((variant) => expanded.add(normalizeSearchText(variant)));
    findMatchingVariantEntry(token, STYLE_VARIANTS)?.variants.forEach((variant) => expanded.add(normalizeSearchText(variant)));
    findMatchingVariantEntry(token, COLOR_VARIANTS)?.variants.forEach((variant) => expanded.add(normalizeSearchText(variant)));
  });

  return Array.from(expanded);
}

export function canonicalizeColor(value?: string) {
  if (!value) return undefined;
  return matchCanonicalValue(value, COLOR_VARIANTS) ?? titleCase(value);
}

export function canonicalizeCategory(value?: string) {
  if (!value) return undefined;
  return matchCanonicalValue(value, CATEGORY_VARIANTS);
}

export function canonicalizeOccasion(value?: string) {
  if (!value) return undefined;
  return matchCanonicalValue(value, OCCASION_VARIANTS);
}

export function canonicalizeStyleTag(value?: string) {
  if (!value) return undefined;
  return matchCanonicalValue(value, STYLE_VARIANTS);
}

export function canonicalizeFit(value?: string) {
  if (!value) return 'regular';
  return matchCanonicalValue(value, FIT_VARIANTS) ?? normalizeSearchText(value);
}

export function canonicalizeModesty(value?: string) {
  if (!value) return undefined;
  return matchCanonicalValue(value, MODESTY_VARIANTS);
}

export function normalizeSize(value?: string) {
  return value?.trim().toUpperCase() || 'M';
}

export function extractCanonicalColor(text: string) {
  return findEntriesInText(text, COLOR_VARIANTS)[0];
}

export function extractCanonicalOccasions(text: string) {
  return findEntriesInText(text, OCCASION_VARIANTS);
}

export function extractCanonicalStyles(text: string) {
  return findEntriesInText(text, STYLE_VARIANTS);
}

export function extractCanonicalCategory(text: string) {
  return findEntriesInText(text, CATEGORY_VARIANTS)[0];
}

export function canonicalizeStyleTags(values: string[]) {
  return Array.from(
    new Set(values.map((value) => canonicalizeStyleTag(value)).filter((value): value is StyleTag => Boolean(value))),
  );
}

export function canonicalizeOccasionTags(values: string[]) {
  return Array.from(
    new Set(values.map((value) => canonicalizeOccasion(value)).filter((value): value is OccasionTag => Boolean(value))),
  );
}

export function normalizeProfileSearchInputs(profile: StyleProfile): StyleProfile {
  return {
    ...profile,
    size: normalizeSize(profile.size),
    colors: Array.from(new Set(profile.colors.map((color) => canonicalizeColor(color) ?? color))),
    styles: canonicalizeStyleTags(profile.styles),
    occasions: Array.from(new Set(profile.occasions.map((occasion) => canonicalizeOccasion(occasion) ?? occasion))),
    fitPreference: canonicalizeFit(profile.fitPreference),
  };
}

export function normalizeProductSearchMetadata(product: Product): Product {
  return {
    ...product,
    color: canonicalizeColor(product.color) ?? product.color,
    sizes: Array.from(new Set(product.sizes.map((size) => normalizeSize(size)))),
    fit: canonicalizeFit(product.fit),
    modesty: canonicalizeModesty(product.modesty) ?? product.modesty,
    styleTags: canonicalizeStyleTags(product.styleTags),
    occasionTags: canonicalizeOccasionTags(product.occasionTags),
    aiSearchIntents: Array.from(new Set(product.aiSearchIntents.map((intent) => intent.trim()).filter(Boolean))),
  };
}

export function buildProductKeywordCorpus(product: Product) {
  return normalizeSearchText(
    [
      product.title,
      product.description,
      product.seller,
      product.color,
      product.category,
      product.fit,
      product.modesty,
      ...product.sizes,
      ...product.styleTags,
      ...product.vibeTags,
      ...product.occasionTags,
      ...product.aiSearchIntents,
    ].join(' '),
  );
}

export function calculateMetadataDepthScore(product: Product) {
  let score = 0;
  if (product.title.trim().length >= 8) score += 1;
  if (product.description.trim().length >= 40) score += 1;
  if (product.styleTags.length >= 2) score += 1;
  if (product.occasionTags.length >= 1) score += 1;
  if (product.aiSearchIntents.length >= 3) score += 1;
  if (product.vibeTags.length >= 1) score += 1;
  if (product.color.trim()) score += 1;
  if (product.fit.trim()) score += 1;
  if (product.sizes.length >= 2) score += 1;
  return score;
}

function findEntriesInText<T extends string>(text: string, dictionary: Array<VariantEntry<T>>) {
  const normalizedText = normalizeSearchText(text);
  return dictionary
    .filter((entry) => entry.variants.some((variant) => normalizedText.includes(normalizeSearchText(variant))))
    .map((entry) => entry.canonical);
}

function findMatchingVariantEntry<T extends string>(value: string, dictionary: Array<VariantEntry<T>>) {
  const normalizedValue = normalizeSearchText(value);
  return dictionary.find((entry) =>
    entry.variants.some((variant) => {
      const normalizedVariant = normalizeSearchText(variant);
      return normalizedValue === normalizedVariant || normalizedValue.includes(normalizedVariant);
    }),
  );
}

function matchCanonicalValue<T extends string>(value: string, dictionary: Array<VariantEntry<T>>) {
  return findMatchingVariantEntry(value, dictionary)?.canonical;
}

function titleCase(value: string) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return value;
  return normalized.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('tr-TR'));
}
