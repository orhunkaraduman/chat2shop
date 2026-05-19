import {
  AISource,
  CatalogSearchInput,
  Category,
  ChatFollowUpMode,
  ChatRecommendInput,
  ChatRecommendResult,
  ModestyLevel,
  OccasionTag,
  ProductSearchCandidate,
  RankedRecommendation,
  SearchIntentInput,
  SearchIntentResult,
  StyleProfile,
  StyleTag,
  UserIntent,
} from './types';
import {
  canonicalizeCategory,
  canonicalizeColor,
  canonicalizeFit,
  canonicalizeModesty,
  canonicalizeOccasion,
  canonicalizeOccasionTags,
  canonicalizeSeasonTags,
  canonicalizeStyleTags,
  extractCanonicalCategory,
  extractCanonicalColor,
  extractCanonicalOccasions,
  extractCanonicalStyles,
  extractVariantTokens,
  normalizeCandidateSearchMetadata,
  normalizeProfileSearchInputs,
  normalizeSearchText,
  normalizeSize,
} from './searchDictionary';

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export const CHAT_STYLE_TAGS: StyleTag[] = [
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
export const CHAT_OCCASION_TAGS: OccasionTag[] = [
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
export const CHAT_CATEGORIES: Category[] = ['dress', 'shirt', 'pants', 'jacket', 'shoes', 'bag', 'accessory'];
export const CHAT_MODESTY_VALUES: NonNullable<UserIntent['modesty']>[] = ['not too revealing', 'balanced', 'bold'];

export function validateChatRecommendInput(value: unknown): ValidationResult<ChatRecommendInput> {
  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const errors: string[] = [];
  const prompt = getString(value.prompt).trim();
  if (!prompt) errors.push('prompt is required.');

  const profileValidation = normalizeProfile(value.profile);
  if (!profileValidation.ok) {
    return { ok: false, errors: profileValidation.errors };
  }

  if (typeof value.candidates !== 'undefined' && !Array.isArray(value.candidates)) {
    return { ok: false, errors: ['candidates must be an array.'] };
  }

  const candidates = Array.isArray(value.candidates)
    ? value.candidates
        .map(normalizeCandidate)
        .filter((candidate): candidate is ProductSearchCandidate => candidate !== undefined)
    : [];

  if (Array.isArray(value.candidates) && candidates.length === 0) {
    errors.push('candidates must include at least one valid product.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      prompt,
      profile: profileValidation.value,
      candidates,
      mode: normalizeFollowUpMode(value.mode),
      anchorProductId: getString(value.anchorProductId) || undefined,
      limit: normalizeLimit(value.limit),
    },
  };
}

export function validateSearchIntentInput(value: unknown): ValidationResult<SearchIntentInput> {
  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const query = getString(value.query).trim();
  if (!query) {
    return { ok: false, errors: ['query is required.'] };
  }

  const profile = isRecord(value.profile) ? partialProfile(value.profile) : undefined;
  return {
    ok: true,
    value: {
      query,
      profile,
    },
  };
}

export function validateCatalogSearchInput(value: unknown): ValidationResult<CatalogSearchInput> {
  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const profile = isRecord(value.profile) ? partialProfile(value.profile) : undefined;
  const filters = isRecord(value.filters)
    ? {
        category: normalizeCategoryValue(value.filters.category),
        color: getString(value.filters.color) || undefined,
        size: normalizeOptionalSize(value.filters.size),
        styles: getStyleTags(value.filters.styles),
        occasion: normalizeOccasionValue(value.filters.occasion),
        budgetMax: normalizeOptionalNumber(value.filters.budgetMax),
      }
    : undefined;

  return {
    ok: true,
    value: {
      query: getString(value.query),
      profile,
      filters,
      sort: normalizeSortMode(value.sort),
      page: normalizePage(value.page),
      pageSize: normalizePageSize(value.pageSize),
      anchorProductId: getString(value.anchorProductId) || undefined,
      mode: normalizeFollowUpMode(value.mode),
    },
  };
}

export function generateMockChatRecommendations(
  input: ChatRecommendInput,
  source: AISource = 'remote',
): ChatRecommendResult {
  const intent = parseUserIntent(input.prompt, input.profile);
  return buildChatRecommendationsFromIntent(input, intent, source);
}

export function buildChatRecommendationsFromIntent(
  input: ChatRecommendInput,
  intent: UserIntent,
  source: AISource = 'remote',
): ChatRecommendResult {
  const recommendations = (input.candidates ?? [])
    .map((product) => {
      const result = calculateMatch(product, intent, input.profile);
      return {
        productId: product.id,
        matchScore: result.score,
        reason: buildReason(product, result.highlights),
        highlights: result.highlights,
      } satisfies RankedRecommendation;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  return {
    searchId: `search-${Date.now()}`,
    intent,
    recommendations,
    source,
    mode: input.mode ?? 'default',
    explanation: buildSearchExplanation(intent, recommendations[0], recommendations.length, input.mode ?? 'default'),
  };
}

export function generateMockSearchIntent(
  input: SearchIntentInput,
  source: AISource = 'remote',
): SearchIntentResult {
  const profile = buildProfileForSearch(input.profile);
  const intent = parseUserIntent(input.query, profile);
  return buildSearchIntentResult(input.query, profile, intent, source);
}

export function buildSearchIntentResult(
  query: string,
  profile: StyleProfile,
  intent: UserIntent,
  source: AISource = 'remote',
): SearchIntentResult {
  const category = extractCanonicalCategory(query);

  return {
    intent,
    filters: {
      category,
      color: canonicalizeColor(intent.color),
      size: normalizeSize(intent.size),
      styles: intent.styles,
      occasion: intent.occasion,
      budgetMax: intent.budgetMax,
    },
    source,
  };
}

export function coerceUserIntent(
  value: Partial<UserIntent> | undefined,
  rawText: string,
  profile: StyleProfile,
): UserIntent {
  const fallback = parseUserIntent(rawText, profile);
  const styles =
    value?.styles?.filter((item): item is StyleTag => typeof item === 'string' && isStyleTag(item)) ?? [];

  return {
    rawText,
    category: typeof value?.category === 'string' && isCategory(value.category) ? value.category : fallback.category,
    occasion: typeof value?.occasion === 'string' && isOccasion(value.occasion) ? value.occasion : fallback.occasion,
    color: typeof value?.color === 'string' && value.color.trim() ? value.color.trim() : fallback.color,
    styles: styles.length > 0 ? Array.from(new Set(styles)).slice(0, 4) : fallback.styles,
    budgetMax:
      typeof value?.budgetMax === 'number' && Number.isFinite(value.budgetMax) ? value.budgetMax : fallback.budgetMax,
    modesty: isIntentModesty(value?.modesty) ? value.modesty : fallback.modesty,
    size: normalizeSize(typeof value?.size === 'string' && value.size.trim() ? value.size : profile.size),
    fitPreference:
      typeof value?.fitPreference === 'string' && value.fitPreference.trim()
        ? canonicalizeFit(value.fitPreference.trim())
        : profile.fitPreference,
  };
}

export function parseUserIntent(prompt: string, profile: StyleProfile): UserIntent {
  const normalizedProfile = normalizeProfileSearchInputs(profile);
  const text = normalizeSearchText(prompt);
  const category = extractCanonicalCategory(text);
  const color = extractCanonicalColor(text);
  const occasion = extractCanonicalOccasions(text)[0];
  const styles = extractCanonicalStyles(text);

  return {
    rawText: prompt,
    category,
    occasion,
    color,
    styles: styles.length > 0 ? styles : normalizedProfile.styles,
    budgetMax: parseBudget(text, normalizedProfile.budgetMax),
    modesty: parseModestyIntent(text),
    size: normalizedProfile.size,
    fitPreference: normalizedProfile.fitPreference,
  };
}

export function calculateMatch(product: ProductSearchCandidate, intent: UserIntent, profile: StyleProfile) {
  let score = 34;
  const highlights: string[] = [];

  if (intent.category) {
    if (product.category === intent.category) {
      score += 18;
      highlights.push('ürün kategorisi aradığın parçayla eşleşiyor');
    } else {
      score -= 22;
    }
  }

  if (intent.occasion && product.occasionTags.includes(intent.occasion)) {
    score += 18;
    highlights.push('kullanım amacına uyuyor');
  }

  if (intent.color && normalizeSearchText(product.color) === normalizeSearchText(intent.color)) {
    score += 14;
    highlights.push(`${intent.color} renk tercihiyle eşleşiyor`);
  }

  const styleOverlap = product.styleTags.filter((tag) => intent.styles.includes(tag));
  if (styleOverlap.length > 0) {
    score += Math.min(20, styleOverlap.length * 8);
    highlights.push(`${styleOverlap.join(', ')} stilinle uyumlu`);
  }

  if (intent.budgetMax && product.price <= intent.budgetMax) {
    score += 10;
    highlights.push('bütçenin altında');
  } else if (intent.budgetMax && product.price <= intent.budgetMax * 1.15) {
    score += 4;
    highlights.push('bütçeye yakın');
  } else {
    score -= 8;
  }

  if (intent.size && product.sizes.includes(intent.size)) {
    score += 8;
    highlights.push(`${intent.size} beden stokta`);
  }

  if (intent.modesty === 'not too revealing') {
    const strictModesty = hasStrictModestyCue(intent.rawText);
    if (product.modesty === 'high') {
      score += strictModesty ? 22 : 16;
      highlights.push('kapalı kesim isteğine uyuyor');
    } else if (product.modesty === 'medium-high') {
      score += strictModesty ? 10 : 14;
      highlights.push('çok açık olmayan kesim');
    } else if (product.modesty === 'medium') {
      score -= strictModesty ? 24 : 14;
    } else {
      score -= strictModesty ? 42 : 30;
    }
  }

  if (profile.colors.some((color) => normalizeSearchText(color) === normalizeSearchText(product.color))) {
    score += 4;
  }

  if (canonicalizeFit(product.fit) === canonicalizeFit(profile.fitPreference)) {
    score += 4;
  }

  const searchIntentOverlap = product.aiSearchIntents.filter((searchIntent) =>
    searchIntentMatches(searchIntent, intent.rawText),
  );
  if (searchIntentOverlap.length > 0) {
    score += Math.min(10, searchIntentOverlap.length * 4);
    highlights.push('AI arama niyeti metadata ile eşleşiyor');
  }

  score += Math.round(product.visibilityScore / 20);
  score += Math.round(product.sellerReliability / 25);

  return {
    score: Math.max(35, Math.min(98, score)),
    highlights,
  };
}

function buildReason(product: ProductSearchCandidate, highlights: string[]) {
  if (highlights.length === 0) {
    return `${product.title}, katalogdaki yakın seçeneklerden biri olarak öne çıktı.`;
  }
  const intentHint = product.aiSearchIntents.slice(0, 2).join(' / ');
  return `${product.title} öneriliyor çünkü ${highlights.slice(0, 4).join(', ')}. İlgili AI intentleri: ${intentHint}.`;
}

function parseBudget(text: string, fallback: number) {
  const match = text.match(/(\d{3,6})\s*(tl|₺)?/i);
  return match ? Number(match[1]) : fallback;
}

function parseModestyIntent(text: string): UserIntent['modesty'] {
  if (hasCoveredIntentCue(text)) return 'not too revealing';
  if (/\b(dekolte|askılı|askili|mini|cesur)\b/.test(text)) return 'bold';
  return 'balanced';
}

function hasCoveredIntentCue(text: string) {
  return (
    text.includes('çok açık olmasın') ||
    text.includes('cok acik olmasin') ||
    text.includes('çok açık olmayan') ||
    text.includes('cok acik olmayan') ||
    text.includes('kapalı') ||
    text.includes('kapali') ||
    text.includes('tesettür') ||
    text.includes('tesettur') ||
    text.includes('mütevazı') ||
    text.includes('mutevazi') ||
    text.includes('modest') ||
    text.includes('covered')
  );
}

function hasStrictModestyCue(text: string) {
  const normalized = normalizeSearchText(text);
  return (
    normalized.includes('kapalı') ||
    normalized.includes('kapali') ||
    normalized.includes('tesettür') ||
    normalized.includes('tesettur') ||
    normalized.includes('mütevazı') ||
    normalized.includes('mutevazi') ||
    normalized.includes('modest') ||
    normalized.includes('covered')
  );
}

function searchIntentMatches(searchIntent: string, rawText: string) {
  const normalizedIntent = normalizeSearchText(searchIntent);
  return extractVariantTokens([rawText]).some((token) => normalizedIntent.includes(token));
}

export function normalizeCandidate(value: unknown): ProductSearchCandidate | undefined {
  if (!isRecord(value)) return undefined;
  const category = getString(value.category) as Category;
  const modesty = getString(value.modesty) as ModestyLevel;
  const normalized = normalizeCandidateSearchMetadata({
    id: getString(value.id),
    title: getString(value.title),
    seller: getString(value.seller) || 'Unknown seller',
    sellerId: getString(value.sellerId) || undefined,
    price: getNumber(value.price),
    color: canonicalizeColor(getString(value.color)) ?? getString(value.color),
    sizes: getStringArray(value.sizes).map((size) => normalizeSize(size)),
    visibilityScore: getNumber(value.visibilityScore),
    category: canonicalizeCategory(category) ?? (isCategory(category) ? category : 'dress'),
    fit: canonicalizeFit(getString(value.fit) || 'regular'),
    modesty: canonicalizeModesty(modesty) ?? (isModesty(modesty) ? modesty : 'medium'),
    season: canonicalizeSeasonTags(getStringArray(value.season)),
    styleTags: canonicalizeStyleTags(getStringArray(value.styleTags)),
    vibeTags: getStringArray(value.vibeTags),
    occasionTags: canonicalizeOccasionTags(getStringArray(value.occasionTags)),
    aiSearchIntents: getStringArray(value.aiSearchIntents),
    description: getString(value.description),
    sellerReliability: getNumber(value.sellerReliability),
    imageUrl: getString(value.imageUrl) || undefined,
    createdAt: getString(value.createdAt) || undefined,
    updatedAt: getString(value.updatedAt) || undefined,
  });

  return normalized;
}

function normalizeProfile(value: unknown): ValidationResult<StyleProfile> {
  if (!isRecord(value)) {
    return { ok: false, errors: ['profile is required.'] };
  }

  const styles = getStyleTags(value.styles);
  const profile = normalizeProfileSearchInputs({
    audience: getString(value.audience) || 'Kadın',
    age: getString(value.age) || undefined,
    size: normalizeSize(getString(value.size) || 'M'),
    height: getString(value.height) || '',
    budgetMax: getNumber(value.budgetMax) || 2500,
    styles: styles.length > 0 ? styles : ['minimal', 'elegant'],
    occasions: getStringArray(value.occasions),
    colors: getStringArray(value.colors),
    fitPreference: canonicalizeFit(getString(value.fitPreference) || 'regular'),
  });

  return { ok: true, value: profile };
}

function partialProfile(value: Record<string, unknown>): Partial<StyleProfile> {
  return {
    audience: getString(value.audience) || undefined,
    age: getString(value.age) || undefined,
    size: getString(value.size) ? normalizeSize(getString(value.size)) : undefined,
    height: getString(value.height) || undefined,
    budgetMax: getNumber(value.budgetMax) || undefined,
    styles: canonicalizeStyleTags(getStringArray(value.styles)),
    occasions: getStringArray(value.occasions).map((occasion) => canonicalizeOccasion(occasion) ?? occasion),
    colors: getStringArray(value.colors).map((color) => canonicalizeColor(color) ?? color),
    fitPreference: getString(value.fitPreference) ? canonicalizeFit(getString(value.fitPreference)) : undefined,
  };
}

function buildProfileForSearch(profile?: Partial<StyleProfile>): StyleProfile {
  return normalizeProfileSearchInputs({
    audience: profile?.audience ?? 'Kadın',
    age: profile?.age,
    size: normalizeSize(profile?.size ?? 'M'),
    height: profile?.height ?? '',
    budgetMax: profile?.budgetMax ?? 2500,
    styles: profile?.styles && profile.styles.length > 0 ? profile.styles : ['minimal', 'elegant'],
    occasions: profile?.occasions ?? [],
    colors: profile?.colors ?? [],
    fitPreference: canonicalizeFit(profile?.fitPreference ?? 'regular'),
  });
}

function normalizeOptionalSize(value: unknown) {
  const normalized = getString(value);
  return normalized ? normalizeSize(normalized) : undefined;
}

export function buildDefaultSearchProfile(profile?: Partial<StyleProfile>) {
  return buildProfileForSearch(profile);
}

export function buildSearchExplanation(
  intent: UserIntent,
  topRecommendation: RankedRecommendation | undefined,
  resultCount: number,
  mode: ChatFollowUpMode = 'default',
) {
  const modeText: Record<ChatFollowUpMode, string> = {
    default: 'niyetine en yakın ürünler',
    same_seller: 'aynı mağazadan alternatifler',
    similar_budget: 'aynı bütçedeki alternatifler',
    similar_products: 'yakın ürün alternatifleri',
    dressier: 'daha şık varyasyonlar',
    simpler: 'daha sade varyasyonlar',
    more_casual: 'daha günlük varyasyonlar',
  };

  const leadReason = topRecommendation?.highlights?.[0];
  const occasion = intent.occasion ? ` ${intent.occasion}` : '';
  return `${resultCount} sonuç ${modeText[mode]} için sıralandı.${occasion}${leadReason ? ` En güçlü sinyal: ${leadReason}.` : ''}`;
}

export function buildRecommendationReason(product: ProductSearchCandidate, highlights: string[]) {
  return buildReason(product, highlights);
}

function getStyleTags(value: unknown): StyleTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StyleTag => typeof item === 'string' && isStyleTag(item));
}

function getOccasionTags(value: unknown): OccasionTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OccasionTag => typeof item === 'string' && isOccasion(item));
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
}

function normalizeOptionalNumber(value: unknown) {
  const normalized = getNumber(value);
  return normalized > 0 ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStyleTag(value: string): value is StyleTag {
  return CHAT_STYLE_TAGS.includes(value as StyleTag);
}

function isOccasion(value: string): value is OccasionTag {
  return CHAT_OCCASION_TAGS.includes(value as OccasionTag);
}

function isCategory(value: string): value is Category {
  return CHAT_CATEGORIES.includes(value as Category);
}

function isModesty(value: string): value is ModestyLevel {
  return ['low', 'medium', 'medium-high', 'high'].includes(value);
}

function isIntentModesty(value: unknown): value is NonNullable<UserIntent['modesty']> {
  return typeof value === 'string' && CHAT_MODESTY_VALUES.includes(value as NonNullable<UserIntent['modesty']>);
}

function normalizeCategoryValue(value: unknown) {
  const normalized = getString(value);
  return canonicalizeCategory(normalized) ?? (isCategory(normalized) ? normalized : undefined);
}

function normalizeOccasionValue(value: unknown) {
  const normalized = getString(value);
  return canonicalizeOccasion(normalized) ?? (isOccasion(normalized) ? normalized : undefined);
}

function normalizeSortMode(value: unknown): CatalogSearchInput['sort'] {
  const normalized = getString(value);
  if (normalized === 'priceAsc' || normalized === 'priceDesc' || normalized === 'new' || normalized === 'ai') {
    return normalized;
  }
  return 'ai';
}

function normalizePage(value: unknown) {
  const normalized = Math.trunc(getNumber(value));
  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}

function normalizePageSize(value: unknown) {
  const normalized = Math.trunc(getNumber(value) || 12);
  return Number.isFinite(normalized) ? Math.max(1, Math.min(24, normalized)) : 12;
}

function normalizeLimit(value: unknown) {
  const normalized = Math.trunc(getNumber(value) || 6);
  return Number.isFinite(normalized) ? Math.max(1, Math.min(12, normalized)) : 6;
}

function normalizeFollowUpMode(value: unknown): ChatFollowUpMode {
  const normalized = getString(value);
  if (
    normalized === 'default' ||
    normalized === 'same_seller' ||
    normalized === 'similar_budget' ||
    normalized === 'similar_products' ||
    normalized === 'dressier' ||
    normalized === 'simpler' ||
    normalized === 'more_casual'
  ) {
    return normalized;
  }
  return 'default';
}
