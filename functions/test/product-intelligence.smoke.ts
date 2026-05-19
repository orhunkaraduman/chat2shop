import assert from 'node:assert/strict';

import {
  generateMockProductIntelligence,
  validateProductIntelligenceInput,
} from '../src/productIntelligence';

const input = {
  draft: {
    imageUrl: 'https://example.com/black-midi-dress.jpg',
    price: '2299',
    stock: '12',
    sizes: 'S,M,L',
    optionalName: '',
    optionalCategory: 'elbise',
  },
  variant: 0,
};

const validation = validateProductIntelligenceInput(input);
assert.equal(validation.ok, true);

if (!validation.ok) {
  throw new Error('Validation unexpectedly failed.');
}

const result = generateMockProductIntelligence(validation.value, 'remote');
assert.equal(result.listing.aiSource, 'remote');
assert.equal(result.listing.category, 'dress');
assert.equal(result.listing.modesty, 'medium-high');
assert.ok(result.listing.season.length > 0);
assert.ok(result.listing.aiSearchIntents.length >= 4);
assert.ok(result.listing.visibilityScore >= 80);
assert.ok(result.listing.visibilityScoreBreakdown.metadataDepth > 0);
assert.ok(result.listing.reasoning.length > 20);

const invalid = validateProductIntelligenceInput({ draft: { imageUrl: '' } });
assert.equal(invalid.ok, false);

console.log(
  `Functions AI smoke passed: ${result.listing.title}, score ${result.listing.visibilityScore}, source ${result.listing.aiSource}.`,
);
