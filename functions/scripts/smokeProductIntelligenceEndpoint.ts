const endpoint =
  process.env.PRODUCT_INTELLIGENCE_ENDPOINT ??
  'https://europe-west1-btkproje-8f05f.cloudfunctions.net/productIntelligence';
const expectAiMode = getCliArg('--expect-ai-mode');

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      draft: {
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
        price: '2299',
        stock: '12',
        sizes: 'S,M,L',
        optionalName: 'Siyah midi mezuniyet elbisesi',
        optionalCategory: 'elbise',
      },
      variant: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Product intelligence smoke failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    listing?: {
      title?: string;
      aiSource?: string;
      confidence?: string;
      visibilityScore?: number;
    };
  };
  const aiMode = response.headers.get('x-chat2shop-ai-mode') ?? 'unknown';
  if (expectAiMode && aiMode !== expectAiMode) {
    throw new Error(`Expected AI mode ${expectAiMode}, got ${aiMode}.`);
  }

  console.log(
    `Product intelligence endpoint smoke passed: aiMode=${aiMode}, source=${payload.listing?.aiSource ?? 'unknown'}, title=${payload.listing?.title ?? 'n/a'}, score=${payload.listing?.visibilityScore ?? 'n/a'}, confidence=${payload.listing?.confidence ?? 'n/a'}.`,
  );
}

function getCliArg(flag: string) {
  const entry = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.slice(flag.length + 1) : undefined;
}

function buildHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.FIREBASE_ID_TOKEN) {
    headers.Authorization = `Bearer ${process.env.FIREBASE_ID_TOKEN}`;
  }
  return headers;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
