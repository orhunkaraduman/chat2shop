const endpoint =
  process.env.CHAT_RECOMMEND_ENDPOINT ??
  'https://europe-west1-btkproje-8f05f.cloudfunctions.net/chatRecommend';
const expectAiMode = getCliArg('--expect-ai-mode');

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      prompt: 'Mezuniyet için siyah, sade ama şık bir elbise arıyorum.',
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
      limit: 4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat recommend smoke failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    source?: string;
    searchId?: string;
    recommendations?: Array<{ productId?: string; matchScore?: number }>;
  };
  const aiMode = response.headers.get('x-chat2shop-ai-mode') ?? 'unknown';
  if (expectAiMode && aiMode !== expectAiMode) {
    throw new Error(`Expected AI mode ${expectAiMode}, got ${aiMode}.`);
  }

  console.log(
    `Chat endpoint smoke passed: source=${payload.source ?? 'unknown'}, aiMode=${aiMode}, searchId=${payload.searchId ?? 'n/a'}, top=${payload.recommendations?.[0]?.productId ?? 'n/a'}, match=${payload.recommendations?.[0]?.matchScore ?? 'n/a'}.`,
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
