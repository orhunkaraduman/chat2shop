import assert from 'node:assert/strict';

import {
  generateMockChatRecommendations,
  generateMockSearchIntent,
  validateChatRecommendInput,
  validateSearchIntentInput,
} from '../src/chatRecommend';

const candidate = {
  id: 'black-midi-dress',
  title: 'Elegant Black Midi Dress',
  price: 2299,
  color: 'Siyah',
  sizes: ['S', 'M', 'L'],
  visibilityScore: 96,
  category: 'dress',
  fit: 'regular',
  modesty: 'medium-high',
  season: ['spring', 'summer'],
  styleTags: ['minimal', 'elegant', 'classic'],
  vibeTags: ['sophisticated', 'refined', 'not too revealing'],
  occasionTags: ['graduation', 'evening', 'wedding guest'],
  aiSearchIntents: ['black graduation dress', 'simple black dress for graduation'],
  description: 'Sade ve zarif midi elbise.',
  sellerReliability: 92,
} as const;

const openCandidate = {
  id: 'open-black-party-dress',
  title: 'Open Black Party Dress',
  price: 2190,
  color: 'Siyah',
  sizes: ['S', 'M', 'L'],
  visibilityScore: 99,
  category: 'dress',
  fit: 'slim',
  modesty: 'low',
  season: ['spring', 'summer'],
  styleTags: ['minimal', 'elegant', 'classic'],
  vibeTags: ['party', 'revealing'],
  occasionTags: ['graduation', 'evening', 'wedding guest'],
  aiSearchIntents: ['black graduation dress', 'open party dress'],
  description: 'Dekolte siyah parti elbisesi.',
  sellerReliability: 96,
} as const;

const input = {
  prompt: 'Mezuniyet için kapalı siyah elbise öner.',
  profile: {
    audience: 'Kadın',
    size: 'M',
    height: '168',
    budgetMax: 2500,
    styles: ['minimal', 'elegant'],
    occasions: ['Mezuniyet'],
    colors: ['Siyah'],
    fitPreference: 'regular',
  },
  candidates: [openCandidate, candidate],
};

const validation = validateChatRecommendInput(input);
assert.equal(validation.ok, true);

if (!validation.ok) {
  throw new Error('Validation unexpectedly failed.');
}

const result = generateMockChatRecommendations(validation.value, 'remote');
assert.equal(result.source, 'remote');
assert.equal(result.intent.occasion, 'graduation');
assert.equal(result.intent.color, 'Siyah');
assert.equal(result.intent.category, 'dress');
assert.equal(result.intent.modesty, 'not too revealing');
assert.equal(result.recommendations.length, 2);
assert.equal(result.recommendations[0]?.productId, 'black-midi-dress');
assert.ok((result.recommendations[0]?.matchScore ?? 0) >= 80);

const searchValidation = validateSearchIntentInput({
  query: 'Siyah mezuniyet elbisesi',
  profile: { size: 'M', budgetMax: 2500, styles: ['minimal'] },
});
assert.equal(searchValidation.ok, true);

if (!searchValidation.ok) {
  throw new Error('Search validation unexpectedly failed.');
}

const search = generateMockSearchIntent(searchValidation.value, 'remote');
assert.equal(search.filters.category, 'dress');
assert.equal(search.filters.color, 'Siyah');
assert.equal(search.filters.occasion, 'graduation');

const invalid = validateChatRecommendInput({ prompt: '', candidates: [] });
assert.equal(invalid.ok, false);

console.log(
  `Functions chat smoke passed: ${result.recommendations[0]?.productId}, match ${result.recommendations[0]?.matchScore}, category ${search.filters.category}.`,
);
