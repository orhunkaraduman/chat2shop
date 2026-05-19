import { products } from '../src/data/mockData';
import { buildTryOnInput, generateTryOn } from '../src/services/tryOn';

async function main() {
  const product = products[0];
  const input = buildTryOnInput(
    product,
    {
      mode: 'avatar',
      avatarUri: 'https://example.com/avatar.jpg',
      selectedSize: product.sizes[0],
      selectedColor: product.color,
      environment: 'outdoor',
    },
    'https://example.com/avatar.jpg',
  );

  const result = await generateTryOn(input);
  const preview = result.preview;

  if (preview.source !== 'mock') {
    throw new Error(`Expected mock try-on source without endpoint, got ${preview.source}`);
  }

  if (preview.productId !== product.id || !preview.previewImageUri || !preview.disclaimer) {
    throw new Error('Expected try-on preview to preserve product and preview fields');
  }

  if (!preview.fitNote.includes(input.selectedSize)) {
    throw new Error('Expected try-on fit note to mention selected size');
  }

  console.log(
    `Try-on smoke passed: ${preview.productTitle}, size ${preview.selectedSize}, source ${preview.source}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
