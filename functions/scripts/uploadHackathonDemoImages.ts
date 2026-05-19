import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { demoProducts } from '../src/demoCatalog';
import type { Product } from '../src/types';

type ImageSource = {
  url: string;
  title: string;
  provider: 'dummyjson' | 'fakestore' | 'platzi' | 'curated';
};

type SourcePool = Record<string, ImageSource[]>;

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const dryRun = args.has('--dry-run') || !shouldApply;
const projectId = getArgValue('--project') ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'btkproje-8f05f';
const bucketName = getArgValue('--bucket') ?? process.env.FIREBASE_STORAGE_BUCKET ?? 'btkproje-8f05f.firebasestorage.app';
const maxImageBytes = 8 * 1024 * 1024;

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const sources = await loadSourcePool();
  const usedUrls = new Set<string>();
  const assignments = demoProducts.map((product) => {
    const poolKey = resolveImagePoolKey(product);
    const pool = sources[poolKey] ?? sources[product.category] ?? sources.fallback;
    if (!pool?.length) throw new Error(`No image source pool for category: ${product.category}`);
    const picked = pickBestImageSource(product, pool, usedUrls);
    const source = picked.score >= 35
      ? picked.source
      : {
          url: product.imageUrl,
          title: `Curated ${product.title}`,
          provider: 'curated' as const,
        };
    usedUrls.add(source.url);
    return {
      product,
      source,
    };
  });

  printSummary(assignments);

  if (dryRun) {
    console.log('Dry-run only. Use --apply to upload images and update demo product imageUrl fields.');
    return;
  }

  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const uploaded: Array<{ productId: string; imageUrl: string; source: ImageSource }> = [];
  let count = 0;

  for (const assignment of assignments) {
    count += 1;
    const uploadedImage = await uploadProductImage({
      token,
      bucketName,
      productId: assignment.product.id,
      source: assignment.source,
    });
    uploaded.push({
      productId: assignment.product.id,
      imageUrl: uploadedImage.imageUrl,
      source: assignment.source,
    });
    console.log(`${String(count).padStart(2, '0')}/${assignments.length} uploaded ${assignment.product.id} <- ${assignment.source.provider}:${assignment.source.title}`);
  }

  await updateFirestoreImageUrls({ token, projectId, uploaded });
  console.log(`Demo product image upload completed: updated ${uploaded.length} products in ${projectId}.`);
}

async function loadSourcePool(): Promise<SourcePool> {
  const [
    womensDresses,
    womensShoes,
    mensShoes,
    womensBags,
    womensJewellery,
    sunglasses,
    tops,
    mensShirts,
    womensWatches,
    mensWatches,
    fakeStore,
    platziStore,
  ] = await Promise.all([
    getDummyImages('womens-dresses'),
    getDummyImages('womens-shoes'),
    getDummyImages('mens-shoes'),
    getDummyImages('womens-bags'),
    getDummyImages('womens-jewellery'),
    getDummyImages('sunglasses'),
    getDummyImages('tops'),
    getDummyImages('mens-shirts'),
    getDummyImages('womens-watches'),
    getDummyImages('mens-watches'),
    getFakeStoreImages(),
    getPlatziStoreImages(),
  ]);

  const fakeClothing = fakeStore.filter((item) => item.title.toLowerCase().includes('jacket') || item.title.toLowerCase().includes('shirt') || item.title.toLowerCase().includes('women'));
  const fakeJackets = fakeStore.filter((item) => item.title.toLowerCase().includes('jacket') || item.title.toLowerCase().includes('coat'));
  const fakeBags = fakeStore.filter((item) => item.title.toLowerCase().includes('backpack') || item.title.toLowerCase().includes('bag'));
  const fakeJewellery = fakeStore.filter((item) => item.title.toLowerCase().includes('gold') || item.title.toLowerCase().includes('bracelet') || item.title.toLowerCase().includes('ring'));
  const platziByTitle = (terms: string[]) => platziStore.filter((item) => terms.some((term) => item.title.toLowerCase().includes(term)));
  const platziPants = platziByTitle(['jogger', 'shorts', 'pants', 'jeans']);
  const platziJackets = platziByTitle(['hoodie', 'sweatshirt', 'jacket', 'coat']);
  const platziShirts = platziStore.filter((item) => {
    const title = item.title.toLowerCase();
    return (title.includes('t-shirt') || title.includes('tee') || title.includes('shirt')) && !title.includes('sweatshirt');
  });
  const platziShoes = platziByTitle(['sneaker', 'shoes', 'runners']);
  const platziBags = platziByTitle(['bag', 'handbag']);
  const platziAccessories = platziByTitle(['cap']);
  const womenHeels = womensShoes.filter((item) => ['heel', 'golden', 'pampi', 'red shoes'].some((term) => item.title.toLowerCase().includes(term)));

  return {
    dress: dedupeSources([...womensDresses, ...tops, ...fakeClothing]),
    shirt: dedupeSources([...platziShirts, ...tops, ...mensShirts, ...fakeClothing]),
    pants: dedupeSources([...platziPants, ...fakeClothing, ...mensShirts, ...womensDresses, ...tops]),
    jacket: dedupeSources([...platziJackets, ...fakeJackets, ...fakeClothing, ...mensShirts]),
    shoes: dedupeSources([...womensShoes, ...mensShoes, ...platziShoes]),
    sneakers: dedupeSources([...mensShoes, ...platziShoes, ...womensShoes]),
    heels: dedupeSources([...womenHeels, ...womensShoes]),
    bag: dedupeSources([...platziBags, ...womensBags, ...fakeBags]),
    accessory: dedupeSources([...womensJewellery, ...sunglasses, ...womensWatches, ...mensWatches, ...fakeJewellery, ...platziAccessories]),
    cap: dedupeSources([...platziAccessories, ...sunglasses]),
    fallback: dedupeSources([...womensDresses, ...tops, ...womensBags, ...womensShoes, ...fakeStore]),
  };
}

function resolveImagePoolKey(product: Product) {
  const title = product.title.toLowerCase();
  if (title.includes('cap')) return 'cap';
  if (title.includes('heel')) return 'heels';
  if (title.includes('bag') || title.includes('tote') || title.includes('duffle') || title.includes('crossbody') || title.includes('backpack')) return 'bag';
  if (title.includes('sneaker')) return 'sneakers';
  if (title.includes('sneaker') || title.includes('shoe') || title.includes('heel') || title.includes('loafer') || title.includes('sandal')) return 'shoes';
  if (title.includes('dress') || title.includes('gown')) return 'dress';
  if (title.includes('legging') || title.includes('jogger') || title.includes('short') || title.includes('pant') || title.includes('jean') || title.includes('skirt')) return 'pants';
  if (title.includes('blazer') || title.includes('jacket') || title.includes('coat') || title.includes('trench') || title.includes('hoodie')) return 'jacket';
  if (title.includes('shirt') || title.includes('tee') || title.includes('top') || title.includes('tunic') || title.includes('co-ord')) return 'shirt';
  if (title.includes('earring') || title.includes('scarf') || title.includes('sock') || title.includes('watch')) return 'accessory';
  return product.category;
}

function pickBestImageSource(product: Product, pool: ImageSource[], usedUrls: Set<string>) {
  const ranked = pool
    .map((source, index) => ({
      source,
      index,
      score: scoreImageSource(product, source) - (usedUrls.has(source.url) ? 35 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0] ?? { source: pool[0], index: 0, score: -999 };
}

function scoreImageSource(product: Product, source: ImageSource) {
  const sourceText = normalizeForScoring(source.title);
  const productText = normalizeForScoring([
    product.title,
    product.category,
    product.color,
    product.description,
    product.styleTags.join(' '),
    product.vibeTags.join(' '),
    product.occasionTags.join(' '),
  ].join(' '));
  let score = 0;

  const targetColor = colorTerms(product.color);
  const sourceColors = knownColorTerms().filter((color) => color.terms.some((term) => hasTerm(sourceText, term)));
  if (targetColor.some((term) => hasTerm(sourceText, term))) score += 80;
  if (sourceColors.length === 0) score -= 30;
  for (const color of sourceColors) {
    if (!targetColor.some((term) => color.terms.includes(term))) score -= 55;
  }

  const targetTypeTerms = productTypeTerms(product);
  if (targetTypeTerms.some((term) => hasTerm(sourceText, term))) score += 45;
  for (const term of unrelatedTypeTerms(product)) {
    if (hasTerm(sourceText, term)) score -= 70;
  }

  for (const token of productText.split(' ')) {
    if (token.length < 5) continue;
    if (['dress', 'shirt', 'pants', 'jacket', 'shoes', 'sneaker', 'bag', 'black', 'white', 'blue', 'green', 'cream', 'beige'].includes(token)) continue;
    if (hasTerm(sourceText, token)) score += 8;
  }

  if (source.provider === 'dummyjson') score += 4;
  if (source.provider === 'platzi' && targetTypeTerms.some((term) => hasTerm(sourceText, term))) score += 6;
  return score;
}

function productTypeTerms(product: Product) {
  const title = normalizeForScoring(product.title);
  const specificTerms = new Set<string>();
  for (const term of ['dress', 'gown', 'shirt', 'tee', 'top', 'tunic', 'blouse', 'pants', 'jeans', 'jogger', 'shorts', 'skirt', 'legging', 'jacket', 'coat', 'blazer', 'trench', 'hoodie', 'sweatshirt', 'sneaker', 'heel', 'loafer', 'sandal', 'runners', 'shoes', 'bag', 'tote', 'handbag', 'duffle', 'crossbody', 'backpack', 'earring', 'earrings', 'scarf', 'socks', 'watch', 'cap', 'sunglasses', 'bracelet', 'ring']) {
    if (hasTerm(title, term)) specificTerms.add(term);
  }
  if (specificTerms.size > 0) return Array.from(specificTerms);

  const categoryTerms: Record<string, string[]> = {
    dress: ['dress', 'gown'],
    shirt: ['shirt', 'tee', 'top', 'tunic', 'blouse'],
    pants: ['pants', 'jeans', 'jogger', 'shorts', 'skirt', 'legging'],
    jacket: ['jacket', 'coat', 'blazer', 'trench', 'hoodie', 'sweatshirt'],
    shoes: ['shoes', 'sneaker', 'loafer', 'sandal'],
    bag: ['bag', 'tote', 'handbag', 'duffle', 'crossbody', 'backpack'],
    accessory: ['earring', 'scarf', 'socks', 'watch', 'cap', 'sunglasses', 'bracelet', 'ring'],
  };
  return categoryTerms[product.category] ?? [];
}

function unrelatedTypeTerms(product: Product) {
  const all = ['dress', 'gown', 'shirt', 'tee', 'top', 'tunic', 'pants', 'jeans', 'jogger', 'shorts', 'skirt', 'legging', 'jacket', 'coat', 'blazer', 'trench', 'hoodie', 'sneaker', 'heel', 'loafer', 'sandal', 'shoes', 'bag', 'tote', 'handbag', 'backpack', 'earring', 'scarf', 'socks', 'watch', 'cap'];
  const own = new Set(productTypeTerms(product));
  return all.filter((term) => !own.has(term));
}

function colorTerms(color: string) {
  const normalized = normalizeForScoring(color);
  const match = knownColorTerms().find((entry) => entry.terms.some((term) => hasTerm(normalized, term)));
  return match?.terms ?? [normalized].filter(Boolean);
}

function knownColorTerms() {
  return [
    { label: 'black', terms: ['black', 'siyah', 'charcoal'] },
    { label: 'white', terms: ['white', 'beyaz', 'ivory'] },
    { label: 'blue', terms: ['blue', 'navy', 'lacivert', 'mavi', 'turquoise'] },
    { label: 'green', terms: ['green', 'emerald', 'olive', 'mint', 'pea', 'yesil', 'yeşil'] },
    { label: 'cream', terms: ['cream', 'ivory', 'krem'] },
    { label: 'beige', terms: ['beige', 'sand', 'taupe', 'nude', 'tan', 'bej'] },
    { label: 'brown', terms: ['brown', 'tan', 'kahverengi'] },
    { label: 'pink', terms: ['pink', 'rose', 'coral', 'pembe'] },
    { label: 'red', terms: ['red', 'kirmizi', 'kırmızı'] },
    { label: 'gray', terms: ['gray', 'grey', 'silver', 'gri'] },
    { label: 'gold', terms: ['gold', 'golden', 'altin', 'altın'] },
  ];
}

function normalizeForScoring(value: string) {
  return value
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasTerm(text: string, term: string) {
  return new RegExp(`(^|\\s)${escapeRegExp(normalizeForScoring(term))}(\\s|$)`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getDummyImages(category: string): Promise<ImageSource[]> {
  const response = await fetch(`https://dummyjson.com/products/category/${category}?limit=30`);
  if (!response.ok) throw new Error(`DummyJSON category ${category} failed with ${response.status}.`);
  const data = await response.json() as {
    products?: Array<{ title?: string; images?: string[]; thumbnail?: string }>;
  };
  const productImages = (data.products ?? []).map((product) => ({
    title: product.title ?? category,
    urls: [...(product.images ?? []), product.thumbnail].filter((url): url is string => Boolean(url)),
  }));
  const maxImages = Math.max(0, ...productImages.map((product) => product.urls.length));
  const interleaved: ImageSource[] = [];
  for (let index = 0; index < maxImages; index += 1) {
    for (const product of productImages) {
      const url = product.urls[index];
      if (!url) continue;
      interleaved.push({
        url,
        title: product.title,
        provider: 'dummyjson' as const,
      });
    }
  }
  return interleaved;
}

async function getFakeStoreImages(): Promise<ImageSource[]> {
  const response = await fetch('https://fakestoreapi.com/products');
  if (!response.ok) throw new Error(`FakeStore API failed with ${response.status}.`);
  const data = await response.json() as Array<{ title?: string; image?: string; category?: string }>;
  return data
    .filter((product) => product.image && product.category !== 'electronics')
    .map((product) => ({
      url: product.image as string,
      title: product.title ?? 'FakeStore product',
      provider: 'fakestore' as const,
    }));
}

async function getPlatziStoreImages(): Promise<ImageSource[]> {
  const response = await fetch('https://api.escuelajs.co/api/v1/products/?offset=0&limit=120');
  if (!response.ok) throw new Error(`Platzi Fake Store API failed with ${response.status}.`);
  const data = await response.json() as Array<{ title?: string; images?: string[]; category?: { name?: string } }>;
  const allowedTerms = ['dress', 'shirt', 'tee', 'hoodie', 'sweatshirt', 'jogger', 'shorts', 'cap', 'shoes', 'sneaker', 'runners', 'bag', 'handbag', 'jacket', 'coat', 'jeans', 'pants', 'skirt'];
  return data
    .filter((product) => product.title && allowedTerms.some((term) => product.title!.toLowerCase().includes(term)))
    .flatMap((product) => (product.images ?? []).map((url) => ({
      url,
      title: product.title ?? 'Platzi product',
      provider: 'platzi' as const,
    })));
}

function dedupeSources(items: ImageSource[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function printSummary(assignments: Array<{ product: { id: string; category: string; title: string }; source: ImageSource }>) {
  const byCategory = new Map<string, number>();
  const byProvider = new Map<string, number>();
  for (const assignment of assignments) {
    byCategory.set(assignment.product.category, (byCategory.get(assignment.product.category) ?? 0) + 1);
    byProvider.set(assignment.source.provider, (byProvider.get(assignment.source.provider) ?? 0) + 1);
  }

  console.log(`Hackathon demo image upload: ${assignments.length} product images.`);
  console.log(`Project: ${projectId}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Mode: ${shouldApply ? 'apply' : 'dry-run'}`);
  console.log(`Categories: ${Array.from(byCategory.entries()).map(([key, count]) => `${key}=${count}`).join(', ')}`);
  console.log(`Providers: ${Array.from(byProvider.entries()).map(([key, count]) => `${key}=${count}`).join(', ')}`);
  console.log('Sample assignments:');
  for (const assignment of assignments.slice(0, 8)) {
    console.log(`- ${assignment.product.id} | ${assignment.product.title} <- ${assignment.source.provider}:${assignment.source.title}`);
  }
}

async function uploadProductImage(input: {
  token: string;
  bucketName: string;
  productId: string;
  source: ImageSource;
}) {
  const image = await downloadImage(input.source.url);
  const extension = extensionForContentType(image.contentType);
  const storagePath = `sellerUploads/demo-hackathon-catalog/products/${input.productId}.${extension}`;
  const downloadToken = randomUUID();
  const metadata = {
    name: storagePath,
    contentType: image.contentType,
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      source: 'hackathon-demo-image-seed',
      originalUrl: input.source.url,
      provider: input.source.provider,
      productId: input.productId,
    },
  };
  const boundary = `chat2shop-demo-${randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\ncontent-type: ${image.contentType}\r\n\r\n`),
    image.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(input.bucketName)}/o?uploadType=multipart&name=${encodeURIComponent(storagePath)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': `multipart/related; boundary=${boundary}`,
      'content-length': String(body.byteLength),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed for ${input.productId} with ${response.status}: ${await response.text()}`);
  }

  return {
    storagePath,
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${input.bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`,
  };
}

async function downloadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed with ${response.status}: ${url}`);
  const contentType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error(`URL did not return an image (${contentType}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxImageBytes) {
    throw new Error(`Image exceeds 8MB: ${url}`);
  }
  return {
    contentType,
    buffer: Buffer.from(arrayBuffer),
  };
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'img';
}

async function updateFirestoreImageUrls(input: {
  token: string;
  projectId: string;
  uploaded: Array<{ productId: string; imageUrl: string; source: ImageSource }>;
}) {
  const now = new Date().toISOString();
  const writes = input.uploaded.map((item) => ({
    update: {
      name: `projects/${input.projectId}/databases/(default)/documents/products/${item.productId}`,
      fields: {
        imageUrl: { stringValue: item.imageUrl },
        updatedAt: { stringValue: now },
      },
    },
    updateMask: {
      fieldPaths: ['imageUrl', 'updatedAt'],
    },
  }));

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${input.projectId}/databases/(default)/documents:batchWrite`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    throw new Error(`Firestore imageUrl update failed with ${response.status}: ${await response.text()}`);
  }

  const result = await response.json() as { status?: Array<{ code?: number; message?: string }> };
  const failures = result.status?.filter((status) => status.code && status.code !== 0) ?? [];
  if (failures.length > 0) {
    throw new Error(`Firestore imageUrl update had ${failures.length} failed writes: ${JSON.stringify(failures.slice(0, 3))}`);
  }
}

function getArgValue(name: string) {
  const rawArgs = process.argv.slice(2);
  const index = rawArgs.indexOf(name);
  if (index >= 0) return rawArgs[index + 1];
  const prefixed = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  return prefixed?.slice(name.length + 1);
}
