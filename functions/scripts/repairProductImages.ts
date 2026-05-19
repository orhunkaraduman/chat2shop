import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type ProductRecord = {
  id: string;
  title: string;
  category: string;
  color: string;
  status: string;
  imageUrl: string;
};

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
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const products = await fetchActiveProducts(token);
  const broken: Array<{ product: ProductRecord; reason: string }> = [];

  for (const product of products) {
    const imageCheck = await checkImage(product.imageUrl);
    if (!imageCheck.ok) {
      broken.push({ product, reason: imageCheck.reason });
    }
  }

  console.log(`Product image repair scan: ${products.length} active products checked.`);
  console.log(`Project: ${projectId}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Mode: ${shouldApply ? 'apply' : 'dry-run'}`);
  console.log(`Broken image records: ${broken.length}`);

  if (broken.length === 0) {
    return;
  }

  const sources = await loadSourcePool();
  const assignments = broken.map((item) => ({
    ...item,
    source: chooseSource(item.product, sources),
  }));

  for (const assignment of assignments) {
    console.log(`- ${assignment.product.id} | ${assignment.product.title} | ${assignment.reason} -> ${assignment.source.provider}:${assignment.source.title}`);
  }

  if (dryRun) {
    console.log('Dry-run only. Use --apply to upload replacement images and update imageUrl fields.');
    return;
  }

  const uploaded: Array<{ productId: string; imageUrl: string; source: ImageSource }> = [];
  let count = 0;
  for (const assignment of assignments) {
    count += 1;
    const replacement = await uploadProductImage({
      token,
      bucketName,
      productId: assignment.product.id,
      source: assignment.source,
    });
    uploaded.push({
      productId: assignment.product.id,
      imageUrl: replacement.imageUrl,
      source: assignment.source,
    });
    console.log(`${String(count).padStart(2, '0')}/${assignments.length} repaired ${assignment.product.id}`);
  }

  await updateFirestoreImageUrls({ token, uploaded });
  console.log(`Product image repair completed: updated ${uploaded.length} products.`);
}

async function fetchActiveProducts(token: string): Promise<ProductRecord[]> {
  const products: ProductRecord[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Firestore product fetch failed with ${response.status}: ${await response.text()}`);
    }

    const result = await response.json() as { documents?: FirestoreDocument[]; nextPageToken?: string };
    for (const document of result.documents ?? []) {
      const product = parseProduct(document);
      if ((product.status || 'active') === 'active') products.push(product);
    }
    pageToken = result.nextPageToken;
  } while (pageToken);

  return products;
}

function parseProduct(document: FirestoreDocument): ProductRecord {
  const fields = document.fields ?? {};
  return {
    id: document.name.split('/').pop() ?? '',
    title: getString(fields.title),
    category: getString(fields.category),
    color: getString(fields.color),
    status: getString(fields.status) || 'active',
    imageUrl: getString(fields.imageUrl),
  };
}

async function checkImage(url: string) {
  if (!url.trim()) return { ok: false, reason: 'empty imageUrl' };

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    if (!contentType.toLowerCase().startsWith('image/')) {
      return { ok: false, reason: `non-image content-type ${contentType || 'unknown'}` };
    }
    return { ok: true, reason: 'ok' };
  } catch (headError) {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
      if (!contentType.toLowerCase().startsWith('image/')) {
        return { ok: false, reason: `non-image content-type ${contentType || 'unknown'}` };
      }
      return { ok: true, reason: 'ok' };
    } catch {
      return {
        ok: false,
        reason: headError instanceof Error ? headError.message : 'image check failed',
      };
    }
  }
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
  const platziAccessories = platziByTitle(['cap', 'watch', 'sunglasses']);
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
    accessory: dedupeSources([...platziAccessories, ...womensJewellery, ...sunglasses, ...womensWatches, ...mensWatches, ...fakeJewellery]),
    fallback: dedupeSources([...womensDresses, ...tops, ...womensBags, ...womensShoes, ...fakeStore]),
  };
}

function chooseSource(product: ProductRecord, sources: SourcePool) {
  const curated = getCuratedReplacement(product);
  if (curated) return curated;

  const poolKey = resolveImagePoolKey(product);
  const pool = sources[poolKey] ?? sources[product.category] ?? sources.fallback;
  if (!pool?.length) throw new Error(`No replacement image source pool for ${product.id}`);
  return pool[0];
}

function getCuratedReplacement(product: ProductRecord): ImageSource | undefined {
  if (product.id === 'black-tailored-pants' || product.title.toLowerCase().includes('tailored pants')) {
    return {
      url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80',
      title: 'Tailored pants editorial product photo',
      provider: 'curated',
    };
  }

  if (product.id === 'silk-scarf-blue' || product.title.toLowerCase().includes('scarf')) {
    return {
      url: 'https://theatticco.com/cdn/shop/products/SeaBlueShibori3_1024x1024.jpg?v=1588320479',
      title: 'Sea blue silk scarf product photo',
      provider: 'curated',
    };
  }

  return undefined;
}

function resolveImagePoolKey(product: Pick<ProductRecord, 'title' | 'category'>) {
  const title = product.title.toLowerCase();
  if (title.includes('cap')) return 'accessory';
  if (title.includes('heel')) return 'heels';
  if (title.includes('bag') || title.includes('tote') || title.includes('duffle') || title.includes('crossbody') || title.includes('backpack')) return 'bag';
  if (title.includes('sneaker')) return 'sneakers';
  if (title.includes('shoe') || title.includes('loafer') || title.includes('sandal')) return 'shoes';
  if (title.includes('dress') || title.includes('gown')) return 'dress';
  if (title.includes('legging') || title.includes('jogger') || title.includes('short') || title.includes('pant') || title.includes('jean') || title.includes('skirt')) return 'pants';
  if (title.includes('blazer') || title.includes('jacket') || title.includes('coat') || title.includes('trench') || title.includes('hoodie')) return 'jacket';
  if (title.includes('shirt') || title.includes('tee') || title.includes('top') || title.includes('tunic') || title.includes('co-ord')) return 'shirt';
  if (title.includes('earring') || title.includes('scarf') || title.includes('sock') || title.includes('watch')) return 'accessory';
  return product.category || 'fallback';
}

async function getDummyImages(category: string): Promise<ImageSource[]> {
  const response = await fetch(`https://dummyjson.com/products/category/${category}?limit=30`);
  if (!response.ok) return [];
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
      interleaved.push({ url, title: product.title, provider: 'dummyjson' });
    }
  }
  return interleaved;
}

async function getFakeStoreImages(): Promise<ImageSource[]> {
  const response = await fetch('https://fakestoreapi.com/products');
  if (!response.ok) return [];
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
  if (!response.ok) return [];
  const data = await response.json() as Array<{ title?: string; images?: string[] }>;
  const allowedTerms = ['dress', 'shirt', 'tee', 'hoodie', 'sweatshirt', 'jogger', 'shorts', 'cap', 'shoes', 'sneaker', 'runners', 'bag', 'handbag', 'jacket', 'coat', 'jeans', 'pants', 'skirt', 'watch', 'sunglasses'];
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

async function uploadProductImage(input: {
  token: string;
  bucketName: string;
  productId: string;
  source: ImageSource;
}) {
  const image = await downloadImage(input.source.url);
  const extension = extensionForContentType(image.contentType);
  const storagePath = `sellerUploads/demo-image-repair/products/${input.productId}.${extension}`;
  const downloadToken = randomUUID();
  const metadata = {
    name: storagePath,
    contentType: image.contentType,
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      source: 'product-image-repair',
      originalUrl: input.source.url,
      provider: input.source.provider,
      productId: input.productId,
    },
  };
  const boundary = `chat2shop-repair-${randomUUID()}`;
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
  uploaded: Array<{ productId: string; imageUrl: string; source: ImageSource }>;
}) {
  const now = new Date().toISOString();
  const writes = input.uploaded.map((item) => ({
    update: {
      name: `projects/${projectId}/databases/(default)/documents/products/${item.productId}`,
      fields: {
        imageUrl: { stringValue: item.imageUrl },
        updatedAt: { stringValue: now },
      },
    },
    updateMask: {
      fieldPaths: ['imageUrl', 'updatedAt'],
    },
  }));

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`, {
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

function getString(value?: FirestoreValue) {
  return value?.stringValue ?? '';
}

function getArgValue(name: string) {
  const rawArgs = process.argv.slice(2);
  const index = rawArgs.indexOf(name);
  if (index >= 0) return rawArgs[index + 1];
  const prefixed = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  return prefixed?.slice(name.length + 1);
}
