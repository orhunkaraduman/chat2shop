import {
  ChatFollowUpMode,
  Category,
  ComparisonRow,
  GeneratedListing,
  OccasionTag,
  Outfit,
  Product,
  RecommendationResult,
  SellerDraft,
  StyleProfile,
  StyleTag,
  UserIntent,
} from '@/types';
import { createMockGeneratedListing } from '@/services/productIntelligence';
import {
  buildProductKeywordCorpus,
  calculateMetadataDepthScore,
  canonicalizeCategory,
  canonicalizeColor,
  canonicalizeFit,
  canonicalizeOccasion,
  canonicalizeStyleTags,
  extractCanonicalCategory,
  extractCanonicalColor,
  extractCanonicalOccasions,
  extractCanonicalStyles,
  extractVariantTokens,
  normalizeProductSearchMetadata,
  normalizeProfileSearchInputs,
  normalizeSearchText,
  tokenizeSearchText,
} from '@/services/searchDictionary';

const chatRecommendEndpoint = process.env.EXPO_PUBLIC_AI_CHAT_RECOMMEND_ENDPOINT;
const chatRecommendTimeoutMs = Number(process.env.EXPO_PUBLIC_AI_CHAT_RECOMMEND_TIMEOUT_MS) || 8000;
const searchIntentEndpoint = process.env.EXPO_PUBLIC_AI_SEARCH_INTENT_ENDPOINT;
const searchIntentTimeoutMs = Number(process.env.EXPO_PUBLIC_AI_SEARCH_INTENT_TIMEOUT_MS) || 6000;
const catalogSearchEndpoint = process.env.EXPO_PUBLIC_AI_CATALOG_SEARCH_ENDPOINT;
const catalogSearchTimeoutMs = Number(process.env.EXPO_PUBLIC_AI_CATALOG_SEARCH_TIMEOUT_MS) || 7000;

export type SearchIntentFilters = {
  category?: Category;
  color?: string;
  size?: string;
  styles: StyleTag[];
  occasion?: OccasionTag;
  budgetMax?: number;
};

export type SearchIntentParseResult = {
  intent: UserIntent;
  filters: SearchIntentFilters;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
};

export type CatalogSearchResult = {
  searchId: string;
  intent: UserIntent;
  filters: SearchIntentFilters;
  recommendations: RecommendationResult[];
  resultIds: string[];
  explanation: string;
  source: 'internal' | 'local';
  mode?: ChatFollowUpMode;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
};

export class DailyChatLimitError extends Error {
  constructor(
    readonly limit?: number,
    readonly remaining?: number,
  ) {
    super('daily_chat_limit_exceeded');
    this.name = 'DailyChatLimitError';
  }
}

export function isDailyChatLimitError(error: unknown) {
  return error instanceof DailyChatLimitError;
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

export function calculateMatch(product: Product, intent: UserIntent, profile: StyleProfile) {
  const normalizedProduct = normalizeProductSearchMetadata(product);
  const normalizedProfile = normalizeProfileSearchInputs(profile);
  let score = 34;
  const highlights: string[] = [];

  if (intent.category) {
    if (normalizedProduct.category === intent.category) {
      score += 18;
      highlights.push('ürün kategorisi aradığın parçayla eşleşiyor');
    } else {
      score -= 22;
    }
  }

  if (intent.occasion && normalizedProduct.occasionTags.includes(intent.occasion)) {
    score += 18;
    highlights.push('kullanım amacına uyuyor');
  }

  if (intent.color && normalizeSearchText(normalizedProduct.color) === normalizeSearchText(intent.color)) {
    score += 14;
    highlights.push(`${intent.color} renk tercihiyle eşleşiyor`);
  }

  const styleOverlap = normalizedProduct.styleTags.filter((tag) => intent.styles.includes(tag));
  if (styleOverlap.length > 0) {
    score += Math.min(20, styleOverlap.length * 8);
    highlights.push(`${styleOverlap.join(', ')} stilinle uyumlu`);
  }

  if (intent.budgetMax && normalizedProduct.price <= intent.budgetMax) {
    score += 10;
    highlights.push('bütçenin altında');
  } else if (intent.budgetMax && normalizedProduct.price <= intent.budgetMax * 1.15) {
    score += 4;
    highlights.push('bütçeye yakın');
  } else {
    score -= 8;
  }

  if (intent.size && normalizedProduct.sizes.includes(intent.size)) {
    score += 8;
    highlights.push(`${intent.size} beden stokta`);
  }

  if (intent.modesty === 'not too revealing') {
    const strictModesty = hasStrictModestyCue(intent.rawText);
    if (normalizedProduct.modesty === 'high') {
      score += strictModesty ? 22 : 16;
      highlights.push('kapalı kesim isteğine uyuyor');
    } else if (normalizedProduct.modesty === 'medium-high') {
      score += strictModesty ? 10 : 14;
      highlights.push('çok açık olmayan kesim');
    } else if (normalizedProduct.modesty === 'medium') {
      score -= strictModesty ? 24 : 14;
    } else {
      score -= strictModesty ? 42 : 30;
    }
  }

  if (normalizedProfile.colors.some((color) => normalizeSearchText(color) === normalizeSearchText(normalizedProduct.color))) {
    score += 4;
  }

  if (normalizedProduct.fit === canonicalizeFit(normalizedProfile.fitPreference)) {
    score += 4;
  }

  const searchIntentOverlap = normalizedProduct.aiSearchIntents.filter(
    (searchIntent) => intent.rawText && searchIntentMatches(searchIntent, intent.rawText),
  );
  if (searchIntentOverlap.length > 0) {
    score += Math.min(10, searchIntentOverlap.length * 4);
    highlights.push('AI arama niyeti metadata ile eşleşiyor');
  }

  score += Math.round(normalizedProduct.visibilityScore / 20);
  score += Math.round(normalizedProduct.sellerReliability / 25);
  score += Math.max(0, calculateMetadataDepthScore(normalizedProduct) - 4);

  return {
    score: Math.max(35, Math.min(98, score)),
    highlights,
  };
}

export function recommendProducts(
  prompt: string,
  profile: StyleProfile,
  catalog: Product[],
): { intent: UserIntent; recommendations: RecommendationResult[] } {
  const intent = parseUserIntent(prompt, profile);
  const recommendations = catalog
    .map((product) => {
      const result = calculateMatch(product, intent, profile);
      return {
        product,
        matchScore: result.score,
        highlights: result.highlights,
        reason: buildReason(product, intent, result.highlights),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  return { intent, recommendations };
}

export async function recommendProductsWithRemote(
  prompt: string,
  profile: StyleProfile,
  catalog: Product[],
  options?: {
    mode?: ChatFollowUpMode;
    anchorProductId?: string;
    limit?: number;
    authToken?: string;
  },
): Promise<{
  searchId: string;
  intent: UserIntent;
  recommendations: RecommendationResult[];
  source?: 'internal' | 'local';
  mode?: ChatFollowUpMode;
  explanation?: string;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
}> {
  if (!chatRecommendEndpoint) {
    const local = recommendProducts(prompt, profile, catalog);
    return {
      ...local,
      searchId: createSearchId(),
      source: 'local',
      mode: options?.mode ?? 'default',
      explanation: buildCatalogExplanation(local.recommendations),
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), chatRecommendTimeoutMs);

  try {
    const response = await fetch(chatRecommendEndpoint, {
      method: 'POST',
      headers: buildRequestHeaders(options?.authToken),
      body: JSON.stringify({
        prompt,
        profile,
        mode: options?.mode ?? 'default',
        anchorProductId: options?.anchorProductId,
        limit: options?.limit,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await readResponseText(response);
      if (response.status === 429 && responseText.includes('daily_chat_limit_exceeded')) {
        throw new DailyChatLimitError(
          getNumberHeader(response, 'X-Chat2Shop-Chat-Limit'),
          getNumberHeader(response, 'X-Chat2Shop-Chat-Remaining'),
        );
      }
      throw new Error(`Chat recommend endpoint failed with ${response.status}: ${responseText}`);
    }

    const payload = await response.json();
    const intent = normalizeRemoteIntent(payload?.intent, prompt, profile);
    const recommendations = normalizeRemoteRecommendations(payload?.recommendations, catalog);

    if (recommendations.length === 0) {
      throw new Error('Chat recommend endpoint returned no usable recommendations.');
    }

    return {
      searchId: typeof payload?.searchId === 'string' ? payload.searchId : createSearchId(),
      intent,
      recommendations,
      source: normalizeCatalogSource(payload?.source),
      mode: normalizeFollowUpMode(payload?.mode),
      explanation: typeof payload?.explanation === 'string' ? payload.explanation : buildCatalogExplanation(recommendations),
      diagnostics: {
        endpoint: chatRecommendEndpoint,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    if (isDailyChatLimitError(error)) {
      throw error;
    }

    const fallback = recommendProducts(prompt, profile, catalog);
    return {
      ...fallback,
      searchId: createSearchId(),
      source: 'local',
      mode: options?.mode ?? 'default',
      explanation: buildCatalogExplanation(fallback.recommendations),
      diagnostics: {
        endpoint: chatRecommendEndpoint,
        durationMs: Date.now() - startedAt,
        fallbackReason: getErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function parseSearchIntentWithRemote(
  query: string,
  profile: StyleProfile,
  options?: {
    authToken?: string;
  },
): Promise<SearchIntentParseResult> {
  const local = buildLocalSearchIntent(query, profile);
  if (!searchIntentEndpoint) {
    return local;
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), searchIntentTimeoutMs);

  try {
    const response = await fetch(searchIntentEndpoint, {
      method: 'POST',
      headers: buildRequestHeaders(options?.authToken),
      body: JSON.stringify({ query, profile }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Search intent endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const payload = await response.json();
    return {
      intent: normalizeRemoteIntent(payload?.intent, query, profile),
      filters: normalizeRemoteFilters(payload?.filters),
      diagnostics: {
        endpoint: searchIntentEndpoint,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      ...local,
      diagnostics: {
        endpoint: searchIntentEndpoint,
        durationMs: Date.now() - startedAt,
        fallbackReason: getErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchCatalogWithRemote(
  query: string,
  profile: StyleProfile,
  catalog: Product[],
  options?: {
    filters?: Partial<SearchIntentFilters>;
    sort?: 'ai' | 'priceAsc' | 'priceDesc' | 'new';
    page?: number;
    pageSize?: number;
    anchorProductId?: string;
    mode?: ChatFollowUpMode;
    authToken?: string;
  },
): Promise<CatalogSearchResult> {
  const localIntent = await parseSearchIntentWithRemote(query, profile, { authToken: options?.authToken });
  const local = buildLocalCatalogSearchResult(query, profile, catalog, {
    ...options,
    filters: {
      ...localIntent.filters,
      ...options?.filters,
      styles: options?.filters?.styles ?? localIntent.filters.styles,
    },
  }, localIntent);

  if (!catalogSearchEndpoint) {
    return local;
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), catalogSearchTimeoutMs);

  try {
    const response = await fetch(catalogSearchEndpoint, {
      method: 'POST',
      headers: buildRequestHeaders(options?.authToken),
      body: JSON.stringify({
        query,
        profile,
        filters: options?.filters,
        sort: options?.sort ?? 'ai',
        page: options?.page ?? 0,
        pageSize: options?.pageSize ?? 12,
        anchorProductId: options?.anchorProductId,
        mode: options?.mode ?? 'default',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Catalog search endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const payload = await response.json();
    const intent = normalizeRemoteIntent(payload?.intent, query, profile);
    const recommendations = normalizeRemoteRecommendations(payload?.results, catalog);

    if (recommendations.length === 0 && local.recommendations.length === 0) {
      return {
        searchId: typeof payload?.searchId === 'string' ? payload.searchId : createSearchId(),
        intent,
        filters: normalizeRemoteFilters(payload?.appliedFilters),
        recommendations: [],
        resultIds: Array.isArray(payload?.resultIds)
          ? payload.resultIds.filter((item: unknown): item is string => typeof item === 'string')
          : [],
        explanation: typeof payload?.explanation === 'string' ? payload.explanation : 'Sonuç bulunamadı.',
        source: normalizeCatalogSource(payload?.source),
        mode: normalizeFollowUpMode(payload?.mode),
        diagnostics: {
          endpoint: catalogSearchEndpoint,
          durationMs: Date.now() - startedAt,
        },
      };
    }

    return {
      searchId: typeof payload?.searchId === 'string' ? payload.searchId : createSearchId(),
      intent,
      filters: normalizeRemoteFilters(payload?.appliedFilters),
      recommendations: recommendations.length > 0 ? recommendations : local.recommendations,
      resultIds: Array.isArray(payload?.resultIds)
        ? payload.resultIds.filter((item: unknown): item is string => typeof item === 'string')
        : (recommendations.length > 0 ? recommendations : local.recommendations).map((item) => item.product.id),
      explanation:
        typeof payload?.explanation === 'string' && payload.explanation.trim().length > 0
          ? payload.explanation
          : buildCatalogExplanation(recommendations.length > 0 ? recommendations : local.recommendations),
      source: normalizeCatalogSource(payload?.source),
      mode: normalizeFollowUpMode(payload?.mode),
      diagnostics: {
        endpoint: catalogSearchEndpoint,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      ...local,
      diagnostics: {
        endpoint: catalogSearchEndpoint,
        durationMs: Date.now() - startedAt,
        fallbackReason: getErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildReason(product: Product, intent: UserIntent, highlights: string[]) {
  if (highlights.length === 0) {
    return `${product.title}, profilindeki stil sinyallerine göre katalogdaki yakın seçeneklerden biri.`;
  }

  const intentHint = product.aiSearchIntents.slice(0, 2).join(' / ');
  return `${product.title} öneriliyor çünkü ${highlights.slice(0, 4).join(', ')}. İlgili AI intentleri: ${intentHint}.`;
}

function buildLocalCatalogSearchResult(
  query: string,
  profile: StyleProfile,
  catalog: Product[],
  options: {
    filters?: Partial<SearchIntentFilters>;
    sort?: 'ai' | 'priceAsc' | 'priceDesc' | 'new';
    page?: number;
    pageSize?: number;
    mode?: ChatFollowUpMode;
    anchorProductId?: string;
  },
  searchPlan: SearchIntentParseResult,
): CatalogSearchResult {
  const filters = {
    ...searchPlan.filters,
    ...options.filters,
    styles: options.filters?.styles ?? searchPlan.filters.styles,
  };
  const activeCatalog = catalog.filter((product) => (product.status ?? 'active') !== 'archived');
  const anchorProduct = options.anchorProductId ? activeCatalog.find((product) => product.id === options.anchorProductId) : undefined;
  const filtered = activeCatalog.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.color && normalizeSearchText(product.color) !== normalizeSearchText(filters.color)) return false;
    if (filters.size && !product.sizes.includes(filters.size)) return false;
    if (filters.occasion && !product.occasionTags.includes(filters.occasion)) return false;
    if (!matchesStyleFilters(product, filters.styles, searchPlan.intent)) return false;
    if (filters.budgetMax && product.price > filters.budgetMax * 1.3) return false;
    if (anchorProduct && product.id === anchorProduct.id) return false;
    return matchesLocalMode(product, anchorProduct, options.mode ?? 'default');
  });

  const recommendations = filtered
    .map((product) => {
      const scored = scoreCatalogSearchResult(product, query, profile, searchPlan);
      const adjusted = adjustLocalModeScore(product, anchorProduct, scored, options.mode ?? 'default');
      return {
        product,
        matchScore: adjusted.score,
        highlights: adjusted.reasons,
        reason: `${product.title}, ${adjusted.reasons.slice(0, 3).join(', ')}.`,
      } satisfies RecommendationResult;
    })
    .sort((a, b) => sortLocalRecommendations(a, b, options.sort ?? 'ai'))
    .slice((options.page ?? 0) * (options.pageSize ?? 12), ((options.page ?? 0) + 1) * (options.pageSize ?? 12));

  return {
    searchId: createSearchId(),
    intent: searchPlan.intent,
    filters,
    recommendations,
    resultIds: recommendations.map((item) => item.product.id),
    explanation: buildCatalogExplanation(recommendations, options.mode),
    source: 'local',
    mode: options.mode ?? 'default',
  };
}

export function scoreCatalogSearchResult(
  product: Product,
  query: string,
  profile: StyleProfile,
  searchPlan?: SearchIntentParseResult,
) {
  const normalizedProduct = normalizeProductSearchMetadata(product);
  const normalizedQuery = query.trim();
  const intent = searchPlan?.intent ?? parseUserIntent(normalizedQuery, profile);
  const base = calculateMatch(normalizedProduct, intent, profile);
  const queryTokens = extractVariantTokens([
    normalizedQuery,
    searchPlan?.filters.category,
    searchPlan?.filters.color,
    searchPlan?.filters.occasion,
    ...(searchPlan?.filters.styles ?? []),
  ]);
  const searchableText = buildProductKeywordCorpus(normalizedProduct);
  const searchableTokens = tokenizeSearchText(searchableText);
  const overlapCount = queryTokens.filter((token) => searchableText.includes(token) || searchableTokens.includes(token)).length;

  let score = base.score;
  const reasons = [...base.highlights];

  if (overlapCount > 0) {
    score += Math.min(14, overlapCount * 3);
    reasons.push(`arama ifadesiyle ${overlapCount} güçlü sinyal eşleşti`);
  }

  if (searchPlan?.filters.category && normalizedProduct.category === searchPlan.filters.category) {
    score += 8;
    reasons.push('kategori niyetine tam uyuyor');
  }

  if (searchPlan?.intent.modesty === 'not too revealing') {
    if (['medium-high', 'high'].includes(normalizedProduct.modesty)) {
      score += 6;
    } else {
      score -= 10;
    }
  }

  if (searchPlan?.filters.color && normalizeSearchText(normalizedProduct.color) === normalizeSearchText(searchPlan.filters.color)) {
    score += 6;
  }

  if (searchPlan?.filters.size && normalizedProduct.sizes.includes(searchPlan.filters.size)) {
    score += 4;
  }

  if (searchPlan?.filters.occasion && normalizedProduct.occasionTags.includes(searchPlan.filters.occasion)) {
    score += 6;
  }

  if (searchPlan?.filters.styles.length) {
    const styleOverlap = normalizedProduct.styleTags.filter((tag) => searchPlan.filters.styles.includes(tag));
    if (styleOverlap.length > 0) {
      score += Math.min(8, styleOverlap.length * 3);
    }
  }

  if (searchPlan?.filters.budgetMax && normalizedProduct.price > searchPlan.filters.budgetMax) {
    score -= 10;
    reasons.push('bütçe üst sınırına yakın veya üstünde');
  }

  const metadataDepth = calculateMetadataDepthScore(normalizedProduct);
  score += Math.max(0, metadataDepth - 4);
  if (metadataDepth <= 4) {
    score -= 3;
    reasons.push('metadata derinliği sınırlı');
  }

  return {
    score: Math.max(35, Math.min(99, score)),
    reasons: Array.from(new Set(reasons)).slice(0, 5),
  };
}

function matchesLocalMode(product: Product, anchorProduct: Product | undefined, mode: ChatFollowUpMode) {
  if (!anchorProduct) return true;
  if (mode === 'same_seller') return Boolean(anchorProduct.sellerId && product.sellerId === anchorProduct.sellerId);
  if (mode === 'similar_budget') return product.price >= anchorProduct.price * 0.75 && product.price <= anchorProduct.price * 1.15;
  if (mode === 'similar_products') {
    return (
      product.category === anchorProduct.category ||
      product.styleTags.some((tag) => anchorProduct.styleTags.includes(tag)) ||
      product.occasionTags.some((tag) => anchorProduct.occasionTags.includes(tag))
    );
  }
  return true;
}

function matchesStyleFilters(product: Product, styles: StyleTag[], intent: UserIntent) {
  const directStyles: string[] = styles.filter((style) => style !== 'modest');
  const directMatch = directStyles.length === 0 || product.styleTags.some((tag) => directStyles.includes(tag));
  const modestRequested = styles.includes('modest') || intent.modesty === 'not too revealing';
  const modestMatch = !modestRequested || product.styleTags.includes('modest') || ['medium-high', 'high'].includes(product.modesty);
  return directMatch && modestMatch;
}

function adjustLocalModeScore(
  product: Product,
  anchorProduct: Product | undefined,
  scored: ReturnType<typeof scoreCatalogSearchResult>,
  mode: ChatFollowUpMode,
) {
  let score = scored.score;
  const reasons = [...scored.reasons];

  if (mode === 'same_seller' && anchorProduct?.sellerId && product.sellerId === anchorProduct.sellerId) {
    score += 10;
    reasons.push('aynı mağazadan');
  }
  if (mode === 'similar_budget' && anchorProduct) {
    score += 6;
    reasons.push('aynı bütçe bandında');
  }
  if (mode === 'similar_products' && anchorProduct) {
    score += 5;
    reasons.push('benzer ürün yapısı');
  }
  if (mode === 'dressier' && product.styleTags.some((tag) => ['elegant', 'classic', 'smart casual'].includes(tag))) {
    score += 8;
    reasons.push('daha şık alternatif');
  }
  if (mode === 'simpler' && product.styleTags.some((tag) => ['minimal', 'classic'].includes(tag))) {
    score += 8;
    reasons.push('daha sade görünüm');
  }
  if (mode === 'more_casual' && product.styleTags.some((tag) => ['casual', 'sporty'].includes(tag))) {
    score += 8;
    reasons.push('daha günlük kullanım');
  }

  return {
    score: Math.max(35, Math.min(99, score)),
    reasons: Array.from(new Set(reasons)).slice(0, 5),
  };
}

function sortLocalRecommendations(
  a: RecommendationResult,
  b: RecommendationResult,
  sort: 'ai' | 'priceAsc' | 'priceDesc' | 'new',
) {
  if (sort === 'priceAsc') return a.product.price - b.product.price;
  if (sort === 'priceDesc') return b.product.price - a.product.price;
  if (sort === 'new') return (b.product.updatedAt ?? b.product.createdAt ?? b.product.id).localeCompare(a.product.updatedAt ?? a.product.createdAt ?? a.product.id);
  return b.matchScore - a.matchScore;
}

function buildCatalogExplanation(
  recommendations: RecommendationResult[],
  mode: ChatFollowUpMode = 'default',
) {
  const modeLabel: Record<ChatFollowUpMode, string> = {
    default: 'niyetine en yakın ürünler',
    same_seller: 'aynı mağazadan alternatifler',
    similar_budget: 'aynı bütçedeki alternatifler',
    similar_products: 'yakın ürün alternatifleri',
    dressier: 'daha şık varyasyonlar',
    simpler: 'daha sade varyasyonlar',
    more_casual: 'daha günlük varyasyonlar',
  };

  if (recommendations.length === 0) {
    return 'Seçili filtreler için sonuç bulunamadı.';
  }

  const lead = recommendations[0];
  const reason = lead?.highlights?.[0];
  return `${recommendations.length} ürün ${modeLabel[mode]} için sıralandı.${reason ? ` En güçlü sinyal: ${reason}.` : ''}`;
}

function serializeProductCandidate(product: Product) {
  return {
    id: product.id,
    title: product.title,
    seller: product.seller,
    sellerId: product.sellerId,
    price: product.price,
    color: product.color,
    sizes: product.sizes,
    visibilityScore: product.visibilityScore,
    category: product.category,
    fit: product.fit,
    modesty: product.modesty,
    season: product.season,
    styleTags: product.styleTags,
    vibeTags: product.vibeTags,
    occasionTags: product.occasionTags,
    aiSearchIntents: product.aiSearchIntents,
    description: product.description,
    sellerReliability: product.sellerReliability,
    imageUrl: product.imageUrl,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function normalizeRemoteIntent(value: unknown, prompt: string, profile: StyleProfile): UserIntent {
  if (!isRecord(value)) {
    return parseUserIntent(prompt, profile);
  }

  const styles = normalizeRemoteStyles(value.styles, profile.styles);
  const category = normalizeRemoteCategory(value.category);
  const color = normalizeCanonicalColor(value.color);
  const occasion = normalizeRemoteOccasion(value.occasion);
  const size = normalizeSize(value.size, profile.size);
  const fitPreference = normalizeFitPreference(value.fitPreference, profile.fitPreference);

  return {
    rawText: typeof value.rawText === 'string' ? value.rawText : prompt,
    category,
    occasion,
    color,
    styles: styles.length > 0 ? styles : profile.styles,
    budgetMax: typeof value.budgetMax === 'number' ? value.budgetMax : profile.budgetMax,
    modesty:
      value.modesty === 'not too revealing' || value.modesty === 'balanced' || value.modesty === 'bold'
        ? value.modesty
        : undefined,
    size,
    fitPreference,
  };
}

function normalizeRemoteRecommendations(value: unknown, catalog: Product[]): RecommendationResult[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item) || typeof item.productId !== 'string') return undefined;
      const product = catalog.find((candidate) => candidate.id === item.productId) ?? normalizeRemoteProductProjection(item.product);
      if (!product) return undefined;
      return {
        product,
        matchScore: typeof item.matchScore === 'number' ? item.matchScore : 70,
        reason: typeof item.reason === 'string' ? item.reason : `${product.title} öneriliyor.`,
        highlights: Array.isArray(item.highlights)
          ? item.highlights.filter((highlight): highlight is string => typeof highlight === 'string')
          : [],
      } satisfies RecommendationResult;
    })
    .filter((item): item is RecommendationResult => Boolean(item))
    .sort((a, b) => b.matchScore - a.matchScore);
}

function normalizeRemoteProductProjection(value: unknown): Product | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') return undefined;
  const category = normalizeRemoteCategory(value.category) ?? 'dress';
  return normalizeProductSearchMetadata({
    id: value.id,
    title: value.title,
    seller: typeof value.seller === 'string' && value.seller.trim() ? value.seller : 'Chat2Shop Seller',
    sellerId: typeof value.sellerId === 'string' ? value.sellerId : undefined,
    price: typeof value.price === 'number' ? value.price : Number(value.price) || 0,
    color: normalizeCanonicalColor(value.color) ?? 'Siyah',
    sizes: Array.isArray(value.sizes)
      ? value.sizes.filter((item): item is string => typeof item === 'string').map((item) => item.toUpperCase())
      : ['STD'],
    stock: 1,
    status: 'active',
    source: 'firebase-seller',
    visibilityScore: typeof value.visibilityScore === 'number' ? value.visibilityScore : 70,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : '',
    category,
    fit: typeof value.fit === 'string' ? canonicalizeFit(value.fit) : 'regular',
    modesty:
      value.modesty === 'low' || value.modesty === 'medium' || value.modesty === 'medium-high' || value.modesty === 'high'
        ? value.modesty
        : 'medium',
    season: Array.isArray(value.season) ? value.season.filter((item): item is string => typeof item === 'string') : [],
    styleTags: normalizeRemoteStyles(value.styleTags, []),
    vibeTags: Array.isArray(value.vibeTags) ? value.vibeTags.filter((item): item is string => typeof item === 'string') : [],
    occasionTags: Array.isArray(value.occasionTags)
      ? value.occasionTags.map(normalizeRemoteOccasion).filter((item): item is OccasionTag => Boolean(item))
      : [],
    aiSearchIntents: Array.isArray(value.aiSearchIntents)
      ? value.aiSearchIntents.filter((item): item is string => typeof item === 'string')
      : [],
    description: typeof value.description === 'string' ? value.description : '',
    sellerReliability: typeof value.sellerReliability === 'number' ? value.sellerReliability : 70,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  });
}

function normalizeCatalogSource(value: unknown): CatalogSearchResult['source'] {
  return value === 'internal' ? 'internal' : 'local';
}

function normalizeFollowUpMode(value: unknown): ChatFollowUpMode {
  return value === 'same_seller' ||
    value === 'similar_budget' ||
    value === 'similar_products' ||
    value === 'dressier' ||
    value === 'simpler' ||
    value === 'more_casual'
    ? value
    : 'default';
}

function createSearchId() {
  return `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildLocalSearchIntent(query: string, profile: StyleProfile) {
  const intent = parseUserIntent(query, profile);
  return {
    intent,
    filters: {
      category: normalizeCategoryFromQuery(query),
      color: intent.color,
      size: intent.size,
      styles: intent.styles,
      occasion: intent.occasion,
      budgetMax: intent.budgetMax,
    },
  };
}

function normalizeRemoteFilters(value: unknown): {
  category?: Category;
  color?: string;
  size?: string;
  styles: StyleTag[];
  occasion?: OccasionTag;
  budgetMax?: number;
} {
  if (!isRecord(value)) {
    return {
      styles: [],
    };
  }

  return {
    category: normalizeRemoteCategory(value.category),
    color: normalizeCanonicalColor(value.color),
    size: normalizeSize(value.size),
    styles: normalizeRemoteStyles(value.styles, []),
    occasion: normalizeRemoteOccasion(value.occasion),
    budgetMax: typeof value.budgetMax === 'number' ? value.budgetMax : undefined,
  };
}

function normalizeCategoryFromQuery(query: string): Category | undefined {
  return extractCanonicalCategory(query);
}

function isCategoryValue(value: unknown): value is Category {
  return (
    value === 'dress' ||
    value === 'shirt' ||
    value === 'pants' ||
    value === 'jacket' ||
    value === 'shoes' ||
    value === 'bag' ||
    value === 'accessory'
  );
}

function normalizeRemoteCategory(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return canonicalizeCategory(value.trim()) ?? (isCategoryValue(value) ? value : undefined);
}

function normalizeCanonicalColor(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return canonicalizeColor(value.trim()) ?? value.trim();
}

function normalizeRemoteOccasion(value: unknown): OccasionTag | undefined {
  if (typeof value !== 'string') return undefined;
  return canonicalizeOccasion(value.trim()) ?? undefined;
}

function normalizeRemoteStyles(value: unknown, fallback: StyleTag[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = canonicalizeStyleTags(value.filter((item): item is string => typeof item === 'string'));
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeFitPreference(value: unknown, fallback: StyleProfile['fitPreference']) {
  if (typeof value !== 'string') return fallback;
  return canonicalizeFit(value.trim());
}

function normalizeSize(value: unknown, fallback?: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : fallback;
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return 'No response body';
  }
}

function getNumberHeader(response: Response, key: string) {
  const value = Number(response.headers.get(key));
  return Number.isFinite(value) ? value : undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? 'Chat recommend endpoint request timed out.' : error.message;
  }
  return 'Chat recommend endpoint request failed.';
}

function buildRequestHeaders(authToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

export function createOutfitForProduct(baseProduct: Product, catalog: Product[]): Outfit {
  const shoe = pickComplement(catalog, 'shoes', baseProduct.occasionTags, baseProduct.styleTags, [baseProduct.id]);
  const bag = pickComplement(catalog, 'bag', baseProduct.occasionTags, baseProduct.styleTags, [baseProduct.id, shoe?.id]);
  const accessory = pickComplement(catalog, 'accessory', baseProduct.occasionTags, baseProduct.styleTags, [
    baseProduct.id,
    shoe?.id,
    bag?.id,
  ]);
  const productIds = Array.from(
    new Set([baseProduct, shoe, bag, accessory].filter(Boolean).map((item) => item.id)),
  );
  const totalPrice = productIds.reduce((total, id) => {
    const product = catalog.find((item) => item.id === id);
    return total + (product?.price ?? 0);
  }, 0);

  return {
    id: `${baseProduct.id}-outfit`,
    title: `${baseProduct.title.replace(/ Dress| Shirt| Pants| Blazer/g, '')} Styled Look`,
    occasion: baseProduct.occasionTags[0] ?? 'daily',
    totalPrice,
    productIds,
    explanation: `${baseProduct.title} için stil ve kullanım amacına uygun ayakkabı, çanta ve aksesuar eşleştirildi.`,
  };
}

function pickComplement(
  catalog: Product[],
  category: Product['category'],
  occasions: OccasionTag[],
  styles: StyleTag[],
  excludedIds: Array<string | undefined> = [],
) {
  const excluded = new Set(excludedIds.filter(Boolean));
  return catalog
    .filter((item) => item.category === category && !excluded.has(item.id))
    .sort((a, b) => {
      const aOccasion = a.occasionTags.some((tag) => occasions.includes(tag)) ? 1 : 0;
      const bOccasion = b.occasionTags.some((tag) => occasions.includes(tag)) ? 1 : 0;
      const aStyle = a.styleTags.some((tag) => styles.includes(tag)) ? 1 : 0;
      const bStyle = b.styleTags.some((tag) => styles.includes(tag)) ? 1 : 0;
      return bOccasion + bStyle + b.visibilityScore / 100 - (aOccasion + aStyle + a.visibilityScore / 100);
    })[0];
}

export function findCheaperAlternatives(product: Product, catalog: Product[], profile: StyleProfile) {
  const prompt = `${product.color} ${product.category} daha uygun fiyatlı`;
  return recommendProducts(prompt, profile, catalog.filter((item) => item.price < product.price)).recommendations.slice(0, 3);
}

export function compareRecommendations(recommendations: RecommendationResult[]) {
  const items = recommendations.slice(0, 3);
  const best = items[0];
  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.product.title}: AI Match %${item.matchScore}, ${item.product.price.toLocaleString('tr-TR')} TL, ${item.product.fit} fit.`,
  );

  return `${lines.join('\n')}\n\nSenin profilin için en güçlü seçenek ${best.product.title}; ${best.reason}`;
}

export function buildComparisonRows(
  recommendations: RecommendationResult[],
  profile: StyleProfile,
): ComparisonRow[] {
  return recommendations.slice(0, 3).map((item, index) => {
    const product = item.product;
    const styleOverlap = product.styleTags.filter((tag) => profile.styles.includes(tag));
    const hasProfileSize = product.sizes.includes(profile.size) || product.sizes.includes('STD');
    const fitRisk = hasProfileSize ? (product.fit === 'slim' ? 'medium' : 'low') : 'high';

    return {
      productId: product.id,
      title: product.title,
      matchScore: item.matchScore,
      price: product.price,
      occasion: product.occasionTags[0] ?? 'daily',
      styleFit: styleOverlap.length > 0 ? styleOverlap.join(', ') : 'yakın eşleşme',
      fitRisk,
      modesty: product.modesty,
      verdict:
        index === 0
          ? 'En güçlü seçenek'
          : item.matchScore >= 85
            ? 'Güçlü alternatif'
            : 'Bağlama göre alternatif',
    };
  });
}

export function generateListingFromDraft(draft: SellerDraft, variant = 0): GeneratedListing {
  return createMockGeneratedListing(draft, variant, 'mock');
}

function searchIntentMatches(searchIntent: string, prompt: string) {
  const promptTokens = tokenize(prompt);
  const intentTokens = tokenize(searchIntent);
  const overlap = intentTokens.filter((token) => promptTokens.includes(token));
  return overlap.length >= 2;
}

function tokenize(value: string) {
  return tokenizeSearchText(value).filter((token) => token.length > 2);
}
