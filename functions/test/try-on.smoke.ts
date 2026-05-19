import assert from 'node:assert/strict';

import { generateMockTryOnPreview, validateTryOnInput } from '../src/tryOn';

const input = {
  product: {
    id: 'black-midi-dress',
    title: 'Elegant Black Midi Dress',
    imageUrl: 'https://example.com/black-midi-dress.jpg',
    color: 'Siyah',
    category: 'dress',
    fit: 'regular',
  },
  mode: 'avatar',
  modelImageUri: 'https://example.com/avatar.jpg',
  selectedSize: 'M',
  selectedColor: 'Siyah',
  outfitProductIds: ['black-midi-dress'],
};

const validation = validateTryOnInput(input);
assert.equal(validation.ok, true);

if (!validation.ok) {
  throw new Error('Validation unexpectedly failed.');
}

const result = generateMockTryOnPreview(validation.value, 'remote');
assert.equal(result.preview.source, 'remote');
assert.equal(result.preview.productId, 'black-midi-dress');
assert.equal(result.preview.selectedSize, 'M');
assert.ok(result.preview.previewImageUri.length > 0);
assert.ok(result.preview.fitNote.includes('M'));

const invalid = validateTryOnInput({ product: { id: '' } });
assert.equal(invalid.ok, false);

console.log(
  `Functions try-on smoke passed: ${result.preview.productTitle}, size ${result.preview.selectedSize}, source ${result.preview.source}.`,
);
