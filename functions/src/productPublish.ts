import { logger } from 'firebase-functions';

import { getDb } from './admin';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_MODESTY_LEVELS,
  PRODUCT_OCCASION_TAGS,
  PRODUCT_SEASON_VALUES,
  PRODUCT_STYLE_TAGS,
} from './productIntelligence';
import { HttpError } from './security';
import type { Category, GeneratedListing, ModestyLevel, OccasionTag, Product, SellerDraft, StyleTag } from './types';

type PublishProductInput = {
  draft: SellerDraft;
  listing: GeneratedListing;
};

type UserRecord = {
  email?: string;
  role?: string;
};

type SellerStoreRecord = {
  name?: string;
  rating?: number;
};

export async function publishProduct(uid: string, body: unknown) {
  const input = validatePublishProductInput(body);
  const db = getDb();
  const userSnapshot = await db.collection('users').doc(uid).get();
  const user = userSnapshot.data() as UserRecord | undefined;

  if (user?.role !== 'seller') {
    throw new HttpError(403, 'Product publish requires a seller account.');
  }

  const storeSnapshot = await db.collection('sellerStores').doc(uid).get();
  const store = storeSnapshot.data() as SellerStoreRecord | undefined;
  const now = new Date().toISOString();
  const productRef = db.collection('products').doc();
  const product = buildProduct({
    id: productRef.id,
    sellerId: uid,
    sellerName: store?.name || user?.email || 'Chat2Shop Seller',
    sellerRating: store?.rating,
    draft: input.draft,
    listing: input.listing,
    now,
  });

  await productRef.set(stripUndefined(product));
  logger.info('Published seller product.', {
    uid,
    productId: product.id,
    source: product.source,
    visibilityScore: product.visibilityScore,
    aiSource: input.listing.aiSource,
  });

  return { product };
}

function buildProduct({
  id,
  sellerId,
  sellerName,
  sellerRating,
  draft,
  listing,
  now,
}: {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRating?: number;
  draft: SellerDraft;
  listing: GeneratedListing;
  now: string;
}): Product {
  const sizes = parseSizes(draft.sizes);
  return {
    id,
    title: listing.title.trim(),
    seller: sellerName,
    sellerId,
    price: parsePrice(draft.price),
    color: listing.color.trim(),
    sizes,
    stock: parseStock(draft.stock),
    status: 'active',
    source: 'firebase-seller',
    sizeChart: sizes.map((size) => ({ size, chest: '', waist: '', hip: '', length: '' })),
    createdAt: now,
    updatedAt: now,
    visibilityScore: clampNumber(listing.visibilityScore, 0, 100),
    imageUrl: draft.imageUrl.trim(),
    category: listing.category,
    fit: listing.fit.trim() || 'regular',
    modesty: listing.modesty,
    season: normalizeStringArray(listing.season, ['all season']),
    styleTags: normalizeStyleTags(listing.styleTags),
    vibeTags: normalizeStringArray(listing.vibeTags, []),
    occasionTags: normalizeOccasionTags(listing.occasionTags),
    aiSearchIntents: normalizeStringArray(listing.aiSearchIntents, [listing.title]),
    description: listing.longDescription.trim() || listing.shortDescription.trim(),
    sellerReliability: sellerRating ? clampNumber(Math.round(sellerRating * 20), 0, 100) : 82,
  };
}

function validatePublishProductInput(value: unknown): PublishProductInput {
  if (!isRecord(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  if (!isRecord(value.draft)) {
    throw new HttpError(400, 'draft is required.');
  }
  if (!isRecord(value.listing)) {
    throw new HttpError(400, 'listing is required.');
  }

  const draft: SellerDraft = {
    imageUrl: getString(value.draft.imageUrl),
    price: getString(value.draft.price),
    stock: getString(value.draft.stock),
    sizes: getString(value.draft.sizes),
    optionalName: getString(value.draft.optionalName),
    optionalCategory: getString(value.draft.optionalCategory),
  };
  const listing = value.listing as Partial<GeneratedListing>;
  const errors: string[] = [];

  if (!isHttpUrl(draft.imageUrl)) errors.push('Geçerli bir ürün görseli zorunlu.');
  if (parsePrice(draft.price) <= 0) errors.push('Fiyat pozitif bir sayı olmalı.');
  if (parseStock(draft.stock) <= 0) errors.push('Stok pozitif bir tam sayı olmalı.');
  if (parseSizes(draft.sizes).length === 0) errors.push('En az bir beden seçeneği zorunlu.');
  if (!listing.title?.trim()) errors.push('Ürün adı zorunlu.');
  if (!listing.longDescription?.trim() && !listing.shortDescription?.trim()) errors.push('Ürün açıklaması zorunlu.');
  if (!isCategory(listing.category)) errors.push('Geçerli kategori zorunlu.');
  if (!isModesty(listing.modesty)) errors.push('Geçerli modesty değeri zorunlu.');

  if (errors.length > 0) {
    throw new HttpError(400, errors.join(' '));
  }

  return {
    draft,
    listing: {
      title: listing.title?.trim() ?? '',
      shortDescription: getString(listing.shortDescription),
      longDescription: getString(listing.longDescription),
      keywords: normalizeStringArray(listing.keywords, []),
      category: listing.category as Category,
      styleTags: normalizeStyleTags(listing.styleTags),
      vibeTags: normalizeStringArray(listing.vibeTags, []),
      occasionTags: normalizeOccasionTags(listing.occasionTags),
      color: getString(listing.color) || 'Siyah',
      fit: getString(listing.fit) || 'regular',
      modesty: listing.modesty as ModestyLevel,
      season: normalizeStringArray(listing.season, ['all season']).filter(isSeason),
      aiSearchIntents: normalizeStringArray(listing.aiSearchIntents, [listing.title?.trim() ?? 'ürün']),
      visibilityScore: clampNumber(Number(listing.visibilityScore) || 70, 0, 100),
      visibilityScoreBreakdown: isRecord(listing.visibilityScoreBreakdown)
        ? listing.visibilityScoreBreakdown as GeneratedListing['visibilityScoreBreakdown']
        : { image: 16, price: 12, stock: 10, sizes: 10, category: 10, naming: 10, metadataDepth: 12 },
      aiSource: listing.aiSource === 'remote' || listing.aiSource === 'remote-fallback' || listing.aiSource === 'manual' || listing.aiSource === 'mock'
        ? listing.aiSource
        : 'manual',
      confidence: listing.confidence === 'high' || listing.confidence === 'medium' || listing.confidence === 'low'
        ? listing.confidence
        : 'medium',
      reasoning: getString(listing.reasoning),
      recommendation: getString(listing.recommendation),
      status: 'published',
    },
  };
}

function parseSizes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\s]+/)
        .map((size) => size.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function parsePrice(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseStock(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function normalizeStyleTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is StyleTag => PRODUCT_STYLE_TAGS.includes(item as StyleTag)).slice(0, 8)
    : [];
}

function normalizeOccasionTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is OccasionTag => PRODUCT_OCCASION_TAGS.includes(item as OccasionTag)).slice(0, 8)
    : [];
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  const values = Array.isArray(value)
    ? value.map((item) => getString(item)).filter(Boolean)
    : [];
  return values.length > 0 ? Array.from(new Set(values)) : fallback;
}

function isCategory(value: unknown): value is Category {
  return PRODUCT_CATEGORIES.includes(value as Category);
}

function isModesty(value: unknown): value is ModestyLevel {
  return PRODUCT_MODESTY_LEVELS.includes(value as ModestyLevel);
}

function isSeason(value: string) {
  return PRODUCT_SEASON_VALUES.includes(value as typeof PRODUCT_SEASON_VALUES[number]);
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => typeof item !== 'undefined')
        .map(([key, item]) => [key, stripUndefined(item)]),
    ) as T;
  }
  return value;
}
