import {
  AISource,
  Category,
  GeneratedListing,
  ModestyLevel,
  OccasionTag,
  ProductIntelligenceInput,
  ProductIntelligenceResult,
  SellerDraft,
  StyleTag,
  VisibilityScoreBreakdown,
} from './types';

type ValidationResult =
  | { ok: true; value: ProductIntelligenceInput }
  | { ok: false; errors: string[] };

export const PRODUCT_CATEGORIES: Category[] = ['dress', 'shirt', 'pants', 'jacket', 'shoes', 'bag', 'accessory'];
export const PRODUCT_STYLE_TAGS: StyleTag[] = [
  'minimal',
  'elegant',
  'classic',
  'smart casual',
  'streetwear',
  'casual',
  'sporty',
  'modest',
  'bohemian',
  'vintage',
  'old money',
  'clean girl',
];
export const PRODUCT_OCCASION_TAGS: OccasionTag[] = [
  'graduation',
  'evening',
  'wedding guest',
  'office',
  'daily',
  'holiday',
  'summer',
  'dinner',
  'sport',
  'weekend',
];
export const PRODUCT_MODESTY_LEVELS: ModestyLevel[] = ['low', 'medium', 'medium-high', 'high'];
export const PRODUCT_FIT_VALUES = ['regular', 'slim', 'oversize', 'structured', 'standard', 'wide leg', 'cropped', 'relaxed'] as const;
export const PRODUCT_SEASON_VALUES = ['spring', 'summer', 'fall', 'winter', 'all season'] as const;

export function validateProductIntelligenceInput(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  if (!isRecord(value.draft)) {
    return { ok: false, errors: ['draft is required.'] };
  }

  const draft = value.draft;
  const normalizedDraft: SellerDraft = {
    imageUrl: getString(draft.imageUrl),
    price: getString(draft.price),
    stock: getString(draft.stock),
    sizes: getString(draft.sizes),
    optionalName: getString(draft.optionalName),
    optionalCategory: getString(draft.optionalCategory),
  };

  if (!normalizedDraft.imageUrl.trim()) errors.push('draft.imageUrl is required.');
  if (!normalizedDraft.price.trim()) errors.push('draft.price is required.');
  if (!normalizedDraft.stock.trim()) errors.push('draft.stock is required.');
  if (!normalizedDraft.sizes.trim()) errors.push('draft.sizes is required.');
  if (Number.isNaN(Number(normalizedDraft.price))) errors.push('draft.price must be numeric.');
  if (Number.isNaN(Number(normalizedDraft.stock))) errors.push('draft.stock must be numeric.');

  const variant = typeof value.variant === 'number' && Number.isFinite(value.variant)
    ? Math.max(0, Math.floor(value.variant))
    : 0;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      draft: normalizedDraft,
      previousListing: isRecord(value.previousListing) ? value.previousListing : undefined,
      variant,
    },
  };
}

export function generateMockProductIntelligence(
  input: ProductIntelligenceInput,
  aiSource: AISource = 'remote',
): ProductIntelligenceResult {
  return {
    listing: createGeneratedListing(input.draft, input.variant ?? 0, aiSource),
  };
}

export function createGeneratedListing(
  draft: SellerDraft,
  variant = 0,
  aiSource: AISource = 'remote',
): GeneratedListing {
  const category = normalizeCategory(draft.optionalCategory || draft.optionalName);
  const color = inferColor(draft.optionalName || draft.optionalCategory, category, variant);
  const title = buildTitle(draft, category, color, variant);
  const fit = inferFit(draft, category);
  const modesty = inferModesty(category);
  const season = inferSeason(category, draft.optionalName);
  const styleTags = inferStyleTags(category, draft.optionalName);
  const vibeTags = inferVibeTags(category, modesty);
  const occasionTags = inferOccasionTags(category, draft.optionalName);
  const aiSearchIntents = buildSearchIntents(title, color, category, occasionTags, styleTags, modesty);
  const visibilityScoreBreakdown = buildVisibilityBreakdown(draft, category, title, aiSearchIntents);
  const visibilityScore = Math.min(
    98,
    Object.values(visibilityScoreBreakdown).reduce((total, score) => total + score, 0),
  );
  const confidence = visibilityScore >= 86 ? 'high' : visibilityScore >= 70 ? 'medium' : 'low';

  return {
    title,
    shortDescription: buildShortDescription(title, occasionTags, styleTags),
    longDescription: buildLongDescription(title, color, fit, modesty, occasionTags),
    keywords: buildKeywords(color, category, styleTags, occasionTags),
    category,
    styleTags,
    vibeTags,
    occasionTags,
    color,
    fit,
    modesty,
    season,
    aiSearchIntents,
    visibilityScore,
    visibilityScoreBreakdown,
    aiSource,
    confidence,
    reasoning: buildReasoning(draft, category, color, styleTags, occasionTags, visibilityScoreBreakdown),
    recommendation: buildRecommendation(visibilityScoreBreakdown),
    status: 'draft',
  };
}

export function buildGeneratedListingFromOverrides(
  draft: SellerDraft,
  overrides: Partial<GeneratedListing>,
  variant = 0,
  aiSource: AISource = 'remote',
): GeneratedListing {
  const base = createGeneratedListing(draft, variant, aiSource);
  const category = isCategory(overrides.category) ? overrides.category : base.category;
  const title = getNonEmptyString(overrides.title) ?? base.title;
  const styleTags = normalizeStyleTags(overrides.styleTags, base.styleTags);
  const occasionTags = normalizeOccasionTags(overrides.occasionTags, base.occasionTags);
  const color = getNonEmptyString(overrides.color) ?? base.color;
  const fit = getNonEmptyString(overrides.fit) ?? base.fit;
  const modesty = isModesty(overrides.modesty) ? overrides.modesty : base.modesty;
  const season = normalizeStringArray(overrides.season, base.season);
  const aiSearchIntents = normalizeStringArray(overrides.aiSearchIntents, base.aiSearchIntents).slice(0, 8);
  const keywords = normalizeStringArray(overrides.keywords, base.keywords).slice(0, 10);
  const vibeTags = normalizeStringArray(overrides.vibeTags, base.vibeTags).slice(0, 8);
  const visibilityScoreBreakdown = buildVisibilityBreakdown(draft, category, title, aiSearchIntents);
  const visibilityScore = Math.min(
    98,
    Object.values(visibilityScoreBreakdown).reduce((total, score) => total + score, 0),
  );

  const merged: GeneratedListing = {
    ...base,
    title,
    shortDescription: getNonEmptyString(overrides.shortDescription) ?? base.shortDescription,
    longDescription: getNonEmptyString(overrides.longDescription) ?? base.longDescription,
    keywords,
    category,
    styleTags,
    vibeTags,
    occasionTags,
    color,
    fit,
    modesty,
    season,
    aiSearchIntents,
    visibilityScoreBreakdown,
    visibilityScore,
    aiSource,
    confidence: normalizeConfidence(overrides.confidence, visibilityScore),
    reasoning:
      getNonEmptyString(overrides.reasoning) ??
      buildReasoning(draft, category, color, styleTags, occasionTags, visibilityScoreBreakdown),
    recommendation:
      getNonEmptyString(overrides.recommendation) ?? buildRecommendation(visibilityScoreBreakdown),
    status: overrides.status === 'published' ? 'published' : 'draft',
  };

  return merged;
}

function buildVisibilityBreakdown(
  draft: SellerDraft,
  category: Category,
  title: string,
  searchIntents: string[],
): VisibilityScoreBreakdown {
  const hasImage = Boolean(draft.imageUrl.trim());
  const price = Number(draft.price) || 0;
  const stock = Number(draft.stock) || 0;
  const sizes = parseSizes(draft.sizes);
  const hasCategory = Boolean(draft.optionalCategory.trim()) || category !== 'dress';
  const hasName = Boolean(draft.optionalName.trim()) || title.length > 8;

  return {
    image: hasImage ? 16 : 0,
    price: price > 0 ? 12 : 0,
    stock: stock > 0 ? 10 : 0,
    sizes: sizes.length > 0 ? 10 : 0,
    category: hasCategory ? 12 : 7,
    naming: hasName ? 12 : 7,
    metadataDepth: Math.min(26, 12 + searchIntents.length * 2),
  };
}

function normalizeCategory(value: string): Category {
  const normalized = normalize(value);
  if (normalized.includes('gomlek') || normalized.includes('gömlek') || normalized.includes('shirt')) return 'shirt';
  if (normalized.includes('pantolon') || normalized.includes('pants')) return 'pants';
  if (normalized.includes('ceket') || normalized.includes('blazer') || normalized.includes('jacket')) return 'jacket';
  if (
    normalized.includes('ayakkabi') ||
    normalized.includes('ayakkabı') ||
    normalized.includes('sneaker') ||
    normalized.includes('shoe')
  ) {
    return 'shoes';
  }
  if (normalized.includes('canta') || normalized.includes('çanta') || normalized.includes('bag')) return 'bag';
  if (normalized.includes('aksesuar') || normalized.includes('earring') || normalized.includes('scarf')) return 'accessory';
  return 'dress';
}

function inferColor(value: string, category: Category, variant: number) {
  const normalized = normalize(value);
  const colors: Array<[string[], string]> = [
    [['siyah', 'black'], 'Siyah'],
    [['beyaz', 'white'], 'Beyaz'],
    [['mavi', 'blue', 'navy', 'lacivert'], 'Mavi'],
    [['krem', 'cream'], 'Krem'],
    [['bej', 'beige', 'nude'], 'Bej'],
    [['pembe', 'pink'], 'Pembe'],
    [['yesil', 'yeşil', 'green'], 'Yeşil'],
  ];
  const match = colors.find(([terms]) => terms.some((term) => normalized.includes(term)));
  if (match) return match[1];
  if (category === 'shirt' || category === 'shoes') return variant % 2 === 0 ? 'Beyaz' : 'Krem';
  if (category === 'bag') return variant % 2 === 0 ? 'Siyah' : 'Bej';
  return variant % 2 === 0 ? 'Siyah' : 'Lacivert';
}

function inferFit(draft: SellerDraft, category: Category) {
  const normalized = normalize(`${draft.optionalName} ${draft.optionalCategory}`);
  if (normalized.includes('oversize')) return 'oversize';
  if (normalized.includes('slim')) return 'slim';
  if (category === 'pants') return 'regular';
  if (category === 'jacket') return 'structured';
  if (category === 'shoes' || category === 'bag' || category === 'accessory') return 'standard';
  return 'regular';
}

function inferModesty(category: Category): ModestyLevel {
  if (category === 'shirt' || category === 'pants' || category === 'jacket') return 'high';
  if (category === 'dress') return 'medium-high';
  return 'medium';
}

function inferSeason(category: Category, name: string) {
  const normalized = normalize(name);
  if (normalized.includes('summer') || normalized.includes('yaz')) return ['summer'];
  if (category === 'jacket') return ['spring', 'fall'];
  if (category === 'shoes' || category === 'bag' || category === 'accessory') return ['all season'];
  return ['spring', 'summer'];
}

function inferStyleTags(category: Category, name: string): StyleTag[] {
  const normalized = normalize(name);
  if (normalized.includes('street')) return ['streetwear', 'casual', 'sporty'];
  if (normalized.includes('bohem')) return ['bohemian', 'casual'];
  if (category === 'dress') return ['minimal', 'elegant', 'classic'];
  if (category === 'shirt' || category === 'pants') return ['minimal', 'smart casual', 'casual'];
  if (category === 'jacket') return ['classic', 'smart casual', 'old money'];
  if (category === 'shoes') return ['minimal', 'casual', 'sporty'];
  if (category === 'bag' || category === 'accessory') return ['minimal', 'classic', 'elegant'];
  return ['minimal', 'casual'];
}

function inferVibeTags(category: Category, modesty: ModestyLevel) {
  if (category === 'dress') return ['sophisticated', 'refined', 'not too revealing'];
  if (category === 'shirt' || category === 'pants') return ['clean', 'comfortable', 'versatile'];
  if (category === 'jacket') return ['polished', 'structured', 'quiet luxury'];
  if (category === 'shoes') return ['clean', 'comfortable', 'versatile'];
  if (category === 'bag') return ['compact', 'polished', 'event ready'];
  return modesty === 'high' ? ['covered', 'minimal', 'soft'] : ['subtle', 'refined', 'event ready'];
}

function inferOccasionTags(category: Category, name: string): OccasionTag[] {
  const normalized = normalize(name);
  if (normalized.includes('office') || normalized.includes('ofis')) return ['office', 'daily', 'dinner'];
  if (normalized.includes('holiday') || normalized.includes('tatil')) return ['holiday', 'summer', 'daily'];
  if (category === 'dress') return ['graduation', 'evening', 'wedding guest'];
  if (category === 'shirt' || category === 'pants' || category === 'jacket') return ['office', 'daily', 'weekend'];
  if (category === 'shoes') return ['daily', 'weekend', 'office'];
  return ['graduation', 'evening', 'daily'];
}

function buildTitle(draft: SellerDraft, category: Category, color: string, variant: number) {
  if (draft.optionalName.trim()) return draft.optionalName.trim();
  const categoryName = {
    dress: variant % 2 === 0 ? 'Midi Dress' : 'Event Dress',
    shirt: variant % 2 === 0 ? 'Oversize Shirt' : 'Clean Shirt',
    pants: variant % 2 === 0 ? 'Tailored Pants' : 'Wide Leg Pants',
    jacket: variant % 2 === 0 ? 'Structured Blazer' : 'Light Jacket',
    shoes: variant % 2 === 0 ? 'Minimal Sneaker' : 'Comfort Shoe',
    bag: variant % 2 === 0 ? 'Compact Shoulder Bag' : 'Soft Tote Bag',
    accessory: variant % 2 === 0 ? 'Minimal Accessory' : 'Refined Accessory',
  }[category];
  return `${color} ${categoryName}`;
}

function buildSearchIntents(
  title: string,
  color: string,
  category: Category,
  occasions: OccasionTag[],
  styles: StyleTag[],
  modesty: ModestyLevel,
) {
  const colorValue = color.toLocaleLowerCase('tr-TR');
  const base = `${colorValue} ${category}`;
  const intents = [
    `${base} ${occasions[0]}`,
    `${styles[0]} ${category}`,
    title.toLocaleLowerCase('tr-TR'),
    `${occasions[0]} için ${colorValue} ${category}`,
  ];
  if (modesty === 'medium-high' || modesty === 'high') {
    intents.push(`not too revealing ${category}`, `çok açık olmayan ${category}`);
  }
  return Array.from(new Set(intents));
}

function buildKeywords(color: string, category: Category, styles: StyleTag[], occasions: OccasionTag[]) {
  return Array.from(new Set([`${color} ${category}`, category, ...styles, ...occasions])).slice(0, 8);
}

function buildShortDescription(title: string, occasions: OccasionTag[], styles: StyleTag[]) {
  return `${title}, ${styles.slice(0, 2).join(' ve ')} stilinde ${occasions[0]} kullanımı için AI tarafından yapılandırıldı.`;
}

function buildLongDescription(
  title: string,
  color: string,
  fit: string,
  modesty: ModestyLevel,
  occasions: OccasionTag[],
) {
  return `${title}; ${color} rengi, ${fit} fit yapısı ve ${modesty} açıklık seviyesiyle ${occasions.join(', ')} bağlamlarında güçlü eşleşme potansiyeli taşır.`;
}

function buildReasoning(
  draft: SellerDraft,
  category: Category,
  color: string,
  styles: StyleTag[],
  occasions: OccasionTag[],
  breakdown: VisibilityScoreBreakdown,
) {
  const evidence = [
    draft.imageUrl ? 'görsel mevcut' : 'görsel eksik',
    Number(draft.price) > 0 ? 'fiyat bilgisi net' : 'fiyat eksik',
    draft.sizes.trim() ? 'beden seçenekleri var' : 'beden seçenekleri eksik',
    `${category} kategorisi ve ${color} rengi çıkarıldı`,
    `${styles.join(', ')} stil etiketleri ${occasions.join(', ')} kullanım alanlarıyla eşlendi`,
  ];
  return `${evidence.join('. ')}. Visibility score breakdown toplamı ${Object.values(breakdown).reduce((total, value) => total + value, 0)}.`;
}

function buildRecommendation(breakdown: VisibilityScoreBreakdown) {
  const weakest = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0];
  if (!weakest || weakest[1] >= 10) {
    return 'Listeleme AI öneri sistemi için güçlü görünüyor. Ek kumaş detayı ve arka görünüm fotoğrafı skoru daha da artırabilir.';
  }
  return `${weakest[0]} alanını güçlendirmek AI Visibility Score değerini artırabilir.`;
}

function parseSizes(value: string) {
  return value
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean);
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR');
}

function normalizeStyleTags(value: unknown, fallback: StyleTag[]) {
  if (!Array.isArray(value)) return fallback;
  const tags = value.filter((item): item is StyleTag => typeof item === 'string' && isStyleTag(item));
  return tags.length > 0 ? Array.from(new Set(tags)).slice(0, 4) : fallback;
}

function normalizeOccasionTags(value: unknown, fallback: OccasionTag[]) {
  if (!Array.isArray(value)) return fallback;
  const tags = value.filter((item): item is OccasionTag => typeof item === 'string' && isOccasionTag(item));
  return tags.length > 0 ? Array.from(new Set(tags)).slice(0, 4) : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? Array.from(new Set(items)) : fallback;
}

function normalizeConfidence(
  value: GeneratedListing['confidence'] | undefined,
  visibilityScore: number,
): GeneratedListing['confidence'] {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return visibilityScore >= 86 ? 'high' : visibilityScore >= 70 ? 'medium' : 'low';
}

function getNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && PRODUCT_CATEGORIES.includes(value as Category);
}

function isStyleTag(value: string): value is StyleTag {
  return PRODUCT_STYLE_TAGS.includes(value as StyleTag);
}

function isOccasionTag(value: string): value is OccasionTag {
  return PRODUCT_OCCASION_TAGS.includes(value as OccasionTag);
}

function isModesty(value: unknown): value is ModestyLevel {
  return typeof value === 'string' && PRODUCT_MODESTY_LEVELS.includes(value as ModestyLevel);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}
