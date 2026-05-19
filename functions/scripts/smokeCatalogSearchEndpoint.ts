const endpoint =
  process.env.CATALOG_SEARCH_ENDPOINT ??
  'https://europe-west1-btkproje-8f05f.cloudfunctions.net/catalogSearch';
const expectSource = getCliArg('--expect-source');
const expectAiMode = getCliArg('--expect-ai-mode');

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      query: 'mezuniyet için siyah elbise',
      profile: {
        audience: 'Kadın',
        size: 'M',
        age: '24',
        height: '168',
        budgetMax: 2500,
        styles: ['minimal', 'elegant'],
        occasions: ['Mezuniyet'],
        colors: ['Siyah'],
        fitPreference: 'regular',
      },
      filters: {
        category: 'dress',
      },
      sort: 'ai',
      page: 0,
      pageSize: 6,
    }),
  });

  if (!response.ok) {
    throw new Error(`Catalog search smoke failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    source?: string;
    resultCount?: number;
    results?: Array<{ productId?: string; matchScore?: number }>;
    recommendations?: Array<{ productId?: string; matchScore?: number }>;
  };
  const aiMode = response.headers.get('x-chat2shop-ai-mode') ?? 'unknown';
  const results = payload.results ?? payload.recommendations ?? [];

  if (expectSource && payload.source !== expectSource) {
    throw new Error(`Expected source ${expectSource}, got ${payload.source ?? 'unknown'}.`);
  }
  if (expectAiMode && aiMode !== expectAiMode) {
    throw new Error(`Expected AI mode ${expectAiMode}, got ${aiMode}.`);
  }

  console.log(
    `Catalog endpoint smoke passed: source=${payload.source ?? 'unknown'}, aiMode=${aiMode}, results=${payload.resultCount ?? 0}, top=${results[0]?.productId ?? 'n/a'}, match=${results[0]?.matchScore ?? 'n/a'}.`,
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
