import { Product, GeneratedListing, SellerDraft } from '@/types';

export function generatedListingToProduct(
  listing: GeneratedListing,
  draft: SellerDraft,
  sellerId = 'demo-seller',
  source: Product['source'] = 'local-seller',
): Product {
  const price = Number(draft.price) || 0;
  const stock = Number(draft.stock) || 1;
  const now = new Date().toISOString();
  const sizes = draft.sizes
    .split(',')
    .map((size) => size.trim().toUpperCase())
    .filter(Boolean);

  return {
    id: `seller-${Date.now()}`,
    title: listing.title,
    seller: 'Demo Seller',
    sellerId,
    price,
    color: listing.color,
    sizes: sizes.length > 0 ? sizes : ['STD'],
    stock,
    status: 'active',
    source,
    sizeChart: createEmptySizeChart(sizes.length > 0 ? sizes : ['STD']),
    createdAt: now,
    updatedAt: now,
    visibilityScore: listing.visibilityScore,
    imageUrl: draft.imageUrl,
    category: listing.category ?? normalizeCategory(draft.optionalCategory),
    fit: listing.fit,
    modesty: listing.modesty ?? 'medium-high',
    season: listing.season ?? ['all season'],
    styleTags: listing.styleTags,
    vibeTags: listing.vibeTags,
    occasionTags: listing.occasionTags,
    aiSearchIntents: listing.aiSearchIntents,
    description: listing.longDescription,
    sellerReliability: 82,
  };
}

function createEmptySizeChart(sizes: string[]): Product['sizeChart'] {
  return sizes.map((size) => ({
    size,
    chest: '',
    waist: '',
    hip: '',
    length: '',
  }));
}

function normalizeCategory(value: string): Product['category'] {
  const normalized = value.toLocaleLowerCase('tr-TR');
  if (normalized.includes('gömlek')) return 'shirt';
  if (normalized.includes('pantolon')) return 'pants';
  if (normalized.includes('ceket')) return 'jacket';
  if (normalized.includes('ayakkabı') || normalized.includes('ayakkabi')) return 'shoes';
  if (normalized.includes('çanta') || normalized.includes('canta')) return 'bag';
  if (normalized.includes('aksesuar')) return 'accessory';
  return 'dress';
}
