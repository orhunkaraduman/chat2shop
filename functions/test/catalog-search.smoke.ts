import assert from 'node:assert/strict';

import { buildDefaultSearchProfile, generateMockSearchIntent } from '../src/chatRecommend';
import { searchCatalogWithRetrieval } from '../src/retrieval';

const candidates = [
  {
    id: 'black-midi-dress',
    title: 'Elegant Black Midi Dress',
    seller: 'Luna Boutique',
    sellerId: 'seller-1',
    price: 2299,
    color: 'Siyah',
    sizes: ['S', 'M', 'L'],
    visibilityScore: 96,
    category: 'dress',
    fit: 'regular',
    modesty: 'medium-high',
    season: ['spring', 'summer'],
    styleTags: ['minimal', 'elegant', 'classic'],
    vibeTags: ['sophisticated'],
    occasionTags: ['graduation', 'evening'],
    aiSearchIntents: ['black graduation dress'],
    description: 'Sade ve zarif midi elbise.',
    sellerReliability: 92,
  },
  {
    id: 'blue-office-shirt',
    title: 'Blue Office Shirt',
    seller: 'North Line',
    sellerId: 'seller-2',
    price: 1490,
    color: 'Mavi',
    sizes: ['S', 'M'],
    visibilityScore: 84,
    category: 'shirt',
    fit: 'regular',
    modesty: 'medium',
    season: ['all season'],
    styleTags: ['smart casual', 'classic'],
    vibeTags: ['clean'],
    occasionTags: ['office'],
    aiSearchIntents: ['office shirt blue'],
    description: 'Ofis için mavi gömlek.',
    sellerReliability: 88,
  },
  {
    id: 'black-evening-dress',
    title: 'Black Evening Dress',
    seller: 'Luna Boutique',
    sellerId: 'seller-1',
    price: 2390,
    color: 'Siyah',
    sizes: ['M', 'L'],
    visibilityScore: 91,
    category: 'dress',
    fit: 'slim',
    modesty: 'medium-high',
    season: ['summer'],
    styleTags: ['elegant', 'classic'],
    vibeTags: ['occasion'],
    occasionTags: ['graduation', 'evening'],
    aiSearchIntents: ['black evening dress'],
    description: 'Davetler için çok açık olmayan siyah elbise.',
    sellerReliability: 90,
  },
] as const;

const profile = buildDefaultSearchProfile({
  size: 'M',
  budgetMax: 2500,
  styles: ['minimal', 'elegant'],
  colors: ['Siyah'],
});
const intentResult = generateMockSearchIntent(
  { query: 'mezuniyet için kapalı siyah elbise', profile },
  'remote',
);
assert.equal(intentResult.intent.category, 'dress');
assert.equal(intentResult.intent.modesty, 'not too revealing');

void (async () => {
  const result = await searchCatalogWithRetrieval({
    query: 'mezuniyet için kapalı siyah elbise',
    profile,
    intent: intentResult.intent,
    filters: intentResult.filters,
    seedCandidates: [...candidates],
    sort: 'ai',
  });

  assert.equal(result.source, 'local');
  assert.equal(result.resultCount, 2);
  assert.equal(result.recommendations[0]?.productId, 'black-midi-dress');
  assert.ok(result.explanation.length > 20);

  const sameSeller = await searchCatalogWithRetrieval({
    query: 'aynı mağazadan alternatif göster',
    profile,
    intent: intentResult.intent,
    filters: intentResult.filters,
    seedCandidates: [...candidates],
    sort: 'ai',
    mode: 'same_seller',
    anchorProductId: 'black-midi-dress',
  });

  assert.equal(sameSeller.resultCount, 1);
  assert.equal(sameSeller.recommendations[0]?.productId, 'black-evening-dress');

  console.log(
    `Functions catalog search smoke passed: default=${result.recommendations[0]?.productId}, sameSeller=${sameSeller.recommendations[0]?.productId}, source=${result.source}.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
