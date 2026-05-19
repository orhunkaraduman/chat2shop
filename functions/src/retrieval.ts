import type {
  CatalogSearchInput,
  CatalogSearchResult,
  ChatFollowUpMode,
  ChatRecommendInput,
  ChatRecommendResult,
  ProductSearchCandidate,
  RankedRecommendation,
  RetrievalMode,
  SearchIntentResult,
  StyleProfile,
  UserIntent,
} from './types';
import { getDb } from './admin';
import {
  buildRecommendationReason,
  buildSearchExplanation,
  calculateMatch,
  normalizeCandidate,
} from './chatRecommend';
import {
  buildCandidateKeywordCorpus,
  calculateMetadataDepthScore,
  extractVariantTokens,
  normalizeCandidateSearchMetadata,
  normalizeSearchText,
} from './searchDictionary';

type SearchFilters = CatalogSearchResult['appliedFilters'];

type RetrievalRequest = {
  query: string;
  profile: StyleProfile;
  intent: UserIntent;
  filters: SearchFilters;
  sort?: CatalogSearchInput['sort'];
  page?: number;
  pageSize?: number;
  anchorProductId?: string;
  mode?: ChatFollowUpMode;
  seedCandidates?: ProductSearchCandidate[];
};

type ResolvedRetrievalRequest = RetrievalRequest & {
  anchor?: ProductSearchCandidate;
};

type RetrievalResponse = {
  searchId: string;
  source: RetrievalMode;
  explanation: string;
  diagnostics?: CatalogSearchResult['diagnostics'];
  recommendations: RankedRecommendation[];
  resultIds: string[];
  resultCount: number;
  page: number;
  hasMore: boolean;
};

export async function searchCatalogWithRetrieval(request: RetrievalRequest): Promise<RetrievalResponse> {
  const startedAt = Date.now();
  const searchId = createSearchId();
  const mode = request.mode ?? 'default';
  const page = Math.max(0, request.page ?? 0);
  const pageSize = Math.max(1, Math.min(24, request.pageSize ?? 12));
  const anchor = await resolveAnchorCandidate(request);
  const resolvedRequest: ResolvedRetrievalRequest = {
    ...request,
    anchor,
  };

  const retrieved = await retrieveCandidates(resolvedRequest);
  const filtered = await applyCandidateFilters(retrieved.candidates, resolvedRequest);
  const ranked = rankCandidates(filtered, resolvedRequest);
  const sorted = sortRecommendations(ranked, request.sort, filtered);
  const startIndex = page * pageSize;
  const paged = sorted.slice(startIndex, startIndex + pageSize);

  return {
    searchId,
    source: retrieved.source,
    explanation: buildSearchExplanation(request.intent, paged[0], sorted.length, mode),
    diagnostics: {
      durationMs: Date.now() - startedAt,
      fallbackReason: retrieved.diagnostics?.fallbackReason,
    },
    recommendations: paged,
    resultIds: paged.map((item) => item.productId),
    resultCount: sorted.length,
    page,
    hasMore: startIndex + pageSize < sorted.length,
  };
}

export async function recommendChatWithRetrieval(
  request: RetrievalRequest & Pick<ChatRecommendInput, 'limit'>,
): Promise<ChatRecommendResult> {
  const response = await searchCatalogWithRetrieval({
    ...request,
    page: 0,
    pageSize: request.limit ?? 6,
  });

  return {
    searchId: response.searchId,
    intent: request.intent,
    recommendations: response.recommendations,
    source: response.source,
    mode: request.mode ?? 'default',
    explanation: response.explanation,
  };
}

export function mergeSearchFilters(
  base: SearchIntentResult['filters'],
  overrides?: Partial<SearchFilters>,
): SearchFilters {
  return {
    category: overrides?.category ?? base.category,
    color: overrides?.color ?? base.color,
    size: overrides?.size ?? base.size,
    styles: overrides?.styles && overrides.styles.length > 0 ? overrides.styles : base.styles,
    occasion: overrides?.occasion ?? base.occasion,
    budgetMax: overrides?.budgetMax ?? base.budgetMax,
  };
}

export function createSearchId() {
  return `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function retrieveCandidates(request: ResolvedRetrievalRequest): Promise<{
  source: RetrievalMode;
  candidates: ProductSearchCandidate[];
  diagnostics?: { fallbackReason?: string };
}> {
  if (request.seedCandidates && request.seedCandidates.length > 0) {
    return { source: 'local', candidates: request.seedCandidates };
  }

  const internalCandidates = await getFirestoreCandidates();
  const scored = scoreInternalCandidates(internalCandidates, request);

  return {
    source: 'internal',
    candidates: scored,
  };
}

async function getFirestoreCandidates() {
  const snapshot = await getDb()
    .collection('products')
    .where('status', '==', 'active')
    .limit(getSearchMaxCandidates())
    .get();
  return snapshot.docs
    .map((doc) => normalizeCandidate({ id: doc.id, ...doc.data() }))
    .filter((candidate): candidate is ProductSearchCandidate => Boolean(candidate))
    .map((candidate) => normalizeCandidateSearchMetadata(candidate));
}

function scoreInternalCandidates(
  candidates: ProductSearchCandidate[],
  request: ResolvedRetrievalRequest,
) {
  return candidates
    .map((candidate) => ({
      candidate,
      retrievalScore: calculateInternalRetrievalScore(candidate, request),
    }))
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .map((entry) => entry.candidate);
}

async function applyCandidateFilters(candidates: ProductSearchCandidate[], request: ResolvedRetrievalRequest) {
  const anchor = request.anchorProductId
    ? candidates.find((candidate) => candidate.id === request.anchorProductId) ?? request.anchor
    : request.anchor;
  const filters = request.filters;

  return candidates.filter((candidate) => {
    if (filters.category && candidate.category !== filters.category) return false;
    if (filters.color && normalize(candidate.color) !== normalize(filters.color)) return false;
    if (filters.size && shouldApplySizeFilter(candidate, filters.size) && !candidate.sizes.includes(filters.size)) return false;
    if (filters.occasion && !candidate.occasionTags.includes(filters.occasion)) return false;
    if (!matchesStyleFilters(candidate, filters.styles, request.intent)) return false;
    if (filters.budgetMax && candidate.price > filters.budgetMax * 1.3) return false;
    if (request.anchorProductId && candidate.id === request.anchorProductId) return false;
    return matchesMode(candidate, anchor, request.mode ?? 'default');
  });
}

function rankCandidates(candidates: ProductSearchCandidate[], request: ResolvedRetrievalRequest) {
  return candidates
    .map((candidate) => {
      const base = calculateMatch(candidate, request.intent, request.profile);
      const adjusted = applyModeBoost(candidate, request, base.score);
      return {
        productId: candidate.id,
        matchScore: Math.max(35, Math.min(99, adjusted.score)),
        highlights: adjusted.highlights,
        reason: buildRecommendationReason(candidate, adjusted.highlights),
        product: candidate,
      } satisfies RankedRecommendation;
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

function sortRecommendations(
  recommendations: RankedRecommendation[],
  sort: CatalogSearchInput['sort'],
  candidates: ProductSearchCandidate[],
) {
  if (!sort || sort === 'ai') return recommendations;

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return [...recommendations].sort((a, b) => {
    const productA = candidateById.get(a.productId);
    const productB = candidateById.get(b.productId);
    if (!productA || !productB) return b.matchScore - a.matchScore;
    if (sort === 'priceAsc') return productA.price - productB.price;
    if (sort === 'priceDesc') return productB.price - productA.price;
    return (productB.updatedAt ?? productB.createdAt ?? productB.id).localeCompare(
      productA.updatedAt ?? productA.createdAt ?? productA.id,
    );
  });
}

async function getAnchorProduct(productId: string) {
  const doc = await getDb().collection('products').doc(productId).get();
  if (!doc.exists) return undefined;
  return normalizeCandidate({ id: doc.id, ...doc.data() });
}

async function resolveAnchorCandidate(request: RetrievalRequest) {
  if (!request.anchorProductId) return undefined;
  const localAnchor = request.seedCandidates?.find((candidate) => candidate.id === request.anchorProductId);
  if (localAnchor) return localAnchor;
  return getAnchorProduct(request.anchorProductId);
}

function matchesMode(
  candidate: ProductSearchCandidate,
  anchor: ProductSearchCandidate | undefined,
  mode: ChatFollowUpMode,
) {
  if (!anchor) return true;

  if (mode === 'same_seller') {
    return Boolean(anchor.sellerId && candidate.sellerId === anchor.sellerId);
  }

  if (mode === 'similar_budget') {
    return candidate.price >= anchor.price * 0.75 && candidate.price <= anchor.price * 1.15;
  }

  if (mode === 'similar_products') {
    return (
      candidate.category === anchor.category ||
      candidate.styleTags.some((tag) => anchor.styleTags.includes(tag)) ||
      candidate.occasionTags.some((tag) => anchor.occasionTags.includes(tag))
    );
  }

  return true;
}

function matchesStyleFilters(candidate: ProductSearchCandidate, styles: string[], intent: UserIntent) {
  const directStyles = styles.filter((style) => style !== 'modest');
  const directMatch = directStyles.length === 0 || candidate.styleTags.some((tag) => directStyles.includes(tag));
  const modestRequested = styles.includes('modest') || intent.modesty === 'not too revealing';
  const modestMatch =
    !modestRequested || candidate.styleTags.includes('modest') || ['medium-high', 'high'].includes(candidate.modesty);
  return directMatch && modestMatch;
}

function applyModeBoost(
  candidate: ProductSearchCandidate,
  request: ResolvedRetrievalRequest,
  score: number,
) {
  const highlights = [...calculateModeHighlights(candidate, request)];
  let nextScore = score;
  const anchor = request.anchor;

  if (request.mode === 'dressier' && hasAnyTag(candidate.styleTags, ['elegant', 'classic', 'smart casual'])) {
    nextScore += 9;
    highlights.push('daha şık stile yakın');
  }

  if (request.mode === 'simpler' && hasAnyTag(candidate.styleTags, ['minimal', 'classic'])) {
    nextScore += 8;
    highlights.push('daha sade alternatif');
  }

  if (request.mode === 'more_casual' && hasAnyTag(candidate.styleTags, ['casual', 'sporty'])) {
    nextScore += 8;
    highlights.push('daha günlük kullanım sinyali');
  }

  if (request.mode === 'same_seller' && request.anchorProductId) {
    nextScore += 10;
  }

  if (request.mode === 'similar_budget' && request.filters.budgetMax && candidate.price <= request.filters.budgetMax) {
    nextScore += 6;
  }

  if (request.mode === 'similar_products' && request.anchorProductId) {
    nextScore += 5;
  }

  if (anchor) {
    if (candidate.category === anchor.category) {
      nextScore += 3;
      highlights.push('aynı kategori');
    }
    if (normalize(candidate.color) === normalize(anchor.color)) {
      nextScore += 2;
      highlights.push('renk ailesi yakın');
    }
    if (candidate.styleTags.some((tag) => anchor.styleTags.includes(tag))) {
      nextScore += 3;
      highlights.push('stil dili benziyor');
    }
    if (candidate.occasionTags.some((tag) => anchor.occasionTags.includes(tag))) {
      nextScore += 3;
      highlights.push('aynı kullanım amacı');
    }
  }

  return {
    score: nextScore,
    highlights: Array.from(new Set(highlights)).slice(0, 5),
  };
}

function calculateModeHighlights(candidate: ProductSearchCandidate, request: ResolvedRetrievalRequest) {
  const highlights: string[] = [];
  if (request.mode === 'same_seller') highlights.push('aynı mağazadan geldi');
  if (request.mode === 'similar_budget') highlights.push('aynı bütçe bandında');
  if (request.mode === 'similar_products') highlights.push('benzer kategori veya stil taşıyor');
  if (request.mode === 'dressier' && candidate.occasionTags.includes('evening')) highlights.push('daha davet odaklı');
  if (request.mode === 'more_casual' && candidate.occasionTags.some((tag) => ['daily', 'weekend'].includes(tag))) {
    highlights.push('günlük kullanım için daha uygun');
  }
  return highlights;
}

function hasAnyTag(tags: string[], targets: string[]) {
  return tags.some((tag) => targets.includes(tag));
}

function normalize(value: string) {
  return normalizeSearchText(value);
}

function shouldApplySizeFilter(candidate: ProductSearchCandidate, size: string) {
  const apparelSize = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size.toUpperCase());
  if (apparelSize && ['shoes', 'bag', 'accessory'].includes(candidate.category)) return false;
  return true;
}

function calculateInternalRetrievalScore(
  candidate: ProductSearchCandidate,
  request: ResolvedRetrievalRequest,
) {
  const normalizedCandidate = normalizeCandidateSearchMetadata(candidate);
  const text = buildCandidateSearchText(normalizedCandidate);
  const tokens = extractVariantTokens([
    request.query,
    request.intent.rawText,
    request.anchor?.title,
    request.filters.color,
    request.filters.occasion,
    request.filters.category,
    request.intent.color,
    request.intent.occasion,
    request.intent.fitPreference,
    ...request.filters.styles,
    ...(request.intent.styles ?? []),
  ]);
  const metadataDepth = calculateMetadataDepthScore(normalizedCandidate);
  const exactIntentHit = normalizedCandidate.aiSearchIntents.some((intent) =>
    normalize(intent).includes(normalize(request.intent.rawText)),
  );

  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += 3;
    if (normalizedCandidate.aiSearchIntents.some((intent) => normalize(intent).includes(token))) score += 5;
    if (normalizedCandidate.title && normalize(normalizedCandidate.title).includes(token)) score += 6;
    if (normalizedCandidate.styleTags.some((tag) => normalize(tag).includes(token))) score += 4;
    if (normalizedCandidate.occasionTags.some((tag) => normalize(tag).includes(token))) score += 4;
    if (normalize(normalizedCandidate.color).includes(token)) score += 2;
  }

  if (exactIntentHit) score += 8;
  if (request.filters.category && normalizedCandidate.category === request.filters.category) score += 10;
  if (request.intent.category && normalizedCandidate.category === request.intent.category) score += 8;
  if (request.filters.color && normalize(normalizedCandidate.color) === normalize(request.filters.color)) score += 9;
  if (request.filters.size && normalizedCandidate.sizes.includes(request.filters.size)) score += 5;
  if (request.filters.occasion && normalizedCandidate.occasionTags.includes(request.filters.occasion)) score += 9;
  if (request.filters.styles.length > 0 && normalizedCandidate.styleTags.some((tag) => request.filters.styles.includes(tag))) {
    score += 7;
  }
  if (request.intent.modesty === 'not too revealing') {
    if (['medium-high', 'high'].includes(normalizedCandidate.modesty)) {
      score += 10;
    } else {
      score -= 18;
    }
  }
  if (
    request.intent.fitPreference &&
    normalize(normalizedCandidate.fit) === normalize(request.intent.fitPreference)
  ) {
    score += 5;
  }
  if (request.anchor?.sellerId && request.mode === 'same_seller' && normalizedCandidate.sellerId === request.anchor.sellerId) {
    score += 10;
  }
  if (request.anchor && request.mode === 'similar_products') {
    if (normalizedCandidate.category === request.anchor.category) score += 7;
    if (normalizedCandidate.styleTags.some((tag) => request.anchor?.styleTags.includes(tag))) score += 6;
  }
  if (request.anchor && request.mode === 'similar_budget') {
    const budgetDelta = Math.abs(normalizedCandidate.price - request.anchor.price);
    score += Math.max(0, 8 - Math.round(budgetDelta / 250));
  }
  score += metadataDepth * 2;
  if (metadataDepth <= 4) score -= 4;
  score += Math.round(normalizedCandidate.visibilityScore / 12);
  score += Math.round(normalizedCandidate.sellerReliability / 15);

  return score;
}

function buildCandidateSearchText(candidate: ProductSearchCandidate) {
  return buildCandidateKeywordCorpus(candidate);
}

function getSearchMaxCandidates() {
  const value = Number(process.env.SEARCH_MAX_CANDIDATES);
  return Number.isFinite(value) && value > 0 ? Math.min(500, Math.floor(value)) : 200;
}
