import {
  AIProductIntelligenceProvider,
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
} from '@/types';

const endpoint = process.env.EXPO_PUBLIC_AI_PRODUCT_INTELLIGENCE_ENDPOINT;
const defaultTimeoutMs = Number(process.env.EXPO_PUBLIC_AI_PRODUCT_INTELLIGENCE_TIMEOUT_MS) || 45000;

type ProductIntelligenceRequestOptions = {
  authToken?: string;
  timeoutMs?: number;
};

export class InsufficientAICreditsError extends Error {
  constructor(message = 'AI kredin kalmadı.') {
    super(message);
    this.name = 'InsufficientAICreditsError';
  }
}

export function isInsufficientAICreditsError(error: unknown) {
  return error instanceof InsufficientAICreditsError;
}

export class MockProductIntelligenceProvider implements AIProductIntelligenceProvider {
  async generateListing(input: ProductIntelligenceInput): Promise<ProductIntelligenceResult> {
    return { listing: createMockGeneratedListing(input.draft, input.variant ?? 0, 'mock') };
  }
}

export class RemoteProductIntelligenceProvider implements AIProductIntelligenceProvider {
  constructor(private readonly fallback = new MockProductIntelligenceProvider()) {}

  async generateListing(
    input: ProductIntelligenceInput,
    options: ProductIntelligenceRequestOptions = {},
  ): Promise<ProductIntelligenceResult> {
    if (!endpoint) {
      return this.fallback.generateListing(input);
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(options.authToken),
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await readResponseText(response);
        if (response.status === 402 && body.includes('insufficient_ai_credits')) {
          throw new InsufficientAICreditsError('AI kredin kalmadı. Jeton Cüzdanı’ndan kredi ekleyebilirsin.');
        }
        throw new Error(`AI endpoint failed with ${response.status}: ${body}`);
      }

      const payload = await response.json();
      const remoteListing = 'listing' in payload ? payload.listing : payload;
      return {
        listing: normalizeGeneratedListing(remoteListing, input.draft, input.variant ?? 0, 'remote'),
        sellerCredits: payload.sellerCredits,
        diagnostics: {
          endpoint,
          durationMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      if (isInsufficientAICreditsError(error)) {
        throw error;
      }
      return {
        listing: createMockGeneratedListing(input.draft, input.variant ?? 0, 'remote-fallback'),
        diagnostics: {
          endpoint,
          durationMs: Date.now() - startedAt,
          fallbackReason: getErrorMessage(error),
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const productIntelligenceProvider = new RemoteProductIntelligenceProvider();

export function generateProductIntelligence(
  input: ProductIntelligenceInput,
  options?: ProductIntelligenceRequestOptions,
) {
  return productIntelligenceProvider.generateListing(input, options);
}

export function createMockGeneratedListing(
  draft: SellerDraft,
  variant = 0,
  aiSource: AISource = 'mock',
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
    Object.values(visibilityScoreBreakdown).reduce((total, value) => total + value, 0),
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

export function normalizeGeneratedListing(
  listing: Partial<GeneratedListing> | undefined,
  draft: SellerDraft,
  variant = 0,
  aiSource: AISource = 'mock',
): GeneratedListing {
  const fallback = createMockGeneratedListing(draft, variant, aiSource);
  if (!listing) return fallback;

  return {
    ...fallback,
    ...listing,
    category: listing.category ?? fallback.category,
    modesty: listing.modesty ?? fallback.modesty,
    season: listing.season ?? fallback.season,
    visibilityScoreBreakdown: listing.visibilityScoreBreakdown ?? fallback.visibilityScoreBreakdown,
    aiSource: listing.aiSource ?? aiSource,
    confidence: listing.confidence ?? fallback.confidence,
    reasoning: listing.reasoning ?? fallback.reasoning,
  };
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
  if (normalized.includes('gömlek') || normalized.includes('gomlek') || normalized.includes('shirt')) return 'shirt';
  if (normalized.includes('pantolon') || normalized.includes('pants')) return 'pants';
  if (normalized.includes('ceket') || normalized.includes('blazer') || normalized.includes('jacket')) return 'jacket';
  if (normalized.includes('ayakkabı') || normalized.includes('ayakkabi') || normalized.includes('sneaker') || normalized.includes('shoe')) return 'shoes';
  if (normalized.includes('çanta') || normalized.includes('canta') || normalized.includes('bag')) return 'bag';
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
    [['yeşil', 'yesil', 'green'], 'Yeşil'],
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
  const base = `${color.toLocaleLowerCase('tr-TR')} ${category}`;
  const intents = [
    `${base} ${occasions[0]}`,
    `${styles[0]} ${category}`,
    `${title.toLocaleLowerCase('tr-TR')}`,
    `${occasions[0]} için ${color.toLocaleLowerCase('tr-TR')} ${category}`,
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

function buildHeaders(authToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return 'No response body';
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.name === 'AbortError'
      ? 'AI isteği beklenenden uzun sürdü. Görsel analizi birkaç saniye sürebilir; lütfen tekrar dene.'
      : error.message;
  }
  return 'AI endpoint request failed.';
}
