import assert from 'node:assert/strict';

import { demoProducts, demoPrompts } from '../src/demoCatalog';
import { buildDefaultSearchProfile, generateMockSearchIntent } from '../src/chatRecommend';
import { searchCatalogWithRetrieval } from '../src/retrieval';

const profile = buildDefaultSearchProfile({
  audience: 'Kadın',
  size: 'M',
  budgetMax: 3000,
  styles: ['minimal', 'elegant', 'smart casual'],
  occasions: ['Mezuniyet', 'Ofis', 'Davet'],
  colors: ['Siyah', 'Beyaz', 'Mavi', 'Krem'],
  fitPreference: 'regular',
});

void (async () => {
  for (const scenario of demoPrompts) {
    const intentResult = generateMockSearchIntent({ query: scenario.prompt, profile }, 'remote');
    const result = await searchCatalogWithRetrieval({
      query: scenario.prompt,
      profile,
      intent: intentResult.intent,
      filters: intentResult.filters,
      seedCandidates: demoProducts,
      sort: 'ai',
      pageSize: 8,
    });

    const topIds = result.resultIds.slice(0, 5);
    const hitIndex = topIds.findIndex((id) => scenario.expectedTopProductIds.includes(id));
    assert.notEqual(
      hitIndex,
      -1,
      `${scenario.id} expected one of ${scenario.expectedTopProductIds.join(', ')} in top 5, got ${topIds.join(', ')}`,
    );
    console.log(`${scenario.id}: ${topIds[0]} (${result.resultCount} results, hit rank ${hitIndex + 1})`);
  }

  console.log(`Hackathon demo search validation passed for ${demoPrompts.length} prompts and ${demoProducts.length} products.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
