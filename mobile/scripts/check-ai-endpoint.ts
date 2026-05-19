import { defaultSellerDraft } from '../src/data/mockData';
import { ProductIntelligenceResult } from '../src/types';

const endpoint = process.env.EXPO_PUBLIC_AI_PRODUCT_INTELLIGENCE_ENDPOINT;
const timeoutMs = Number(process.env.EXPO_PUBLIC_AI_PRODUCT_INTELLIGENCE_TIMEOUT_MS) || 8000;

async function main() {
  if (!endpoint) {
    console.log('AI endpoint smoke skipped: EXPO_PUBLIC_AI_PRODUCT_INTELLIGENCE_ENDPOINT is not set.');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        draft: defaultSellerDraft,
        variant: 0,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Expected 200 OK, got ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as ProductIntelligenceResult;
    const listing = payload.listing;

    if (!listing) {
      throw new Error('Expected ProductIntelligenceResult.listing');
    }

    if (listing.aiSource !== 'remote') {
      throw new Error(`Expected aiSource remote, got ${listing.aiSource}`);
    }

    if (!listing.title || !listing.category || !listing.visibilityScoreBreakdown) {
      throw new Error('Expected listing title, category and visibilityScoreBreakdown');
    }

    if (listing.visibilityScore < 70) {
      throw new Error(`Expected visibilityScore >= 70, got ${listing.visibilityScore}`);
    }

    console.log(
      `AI endpoint smoke passed: ${listing.title}, category ${listing.category}, score ${listing.visibilityScore}, source ${listing.aiSource}.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.FIREBASE_ID_TOKEN) {
    headers.Authorization = `Bearer ${process.env.FIREBASE_ID_TOKEN}`;
  }
  return headers;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
