import { execFileSync } from 'node:child_process';

import { initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';

import { assertDemoCatalogShape, demoProducts, demoStores } from '../src/demoCatalog';

const DEMO_PREFIX = 'demo-hackathon-';
const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldReset = args.has('--reset-demo');
const dryRun = args.has('--dry-run') || (!shouldApply && !shouldReset);
const projectId = getArgValue('--project') ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'btkproje-8f05f';

if (shouldApply && shouldReset) {
  console.error('Use either --apply or --reset-demo, not both.');
  process.exit(1);
}

assertDemoCatalogShape();

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  printSummary();

  if (dryRun) {
    console.log('Dry-run only. Use --apply to write demo stores/products or --reset-demo to remove demo data.');
    return;
  }

  const now = new Date().toISOString();

  try {
    initializeApp({ projectId });
    const db = getFirestore();

    if (shouldReset) {
      const [productDocs, storeDocs] = await Promise.all([
        listPrefixedDocs(db, 'products'),
        listPrefixedDocs(db, 'sellerStores'),
      ]);
      const batch = db.batch();
      for (const doc of productDocs) {
        batch.update(doc.ref, { status: 'archived', updatedAt: now });
      }
      for (const doc of storeDocs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      console.log(`Demo reset completed: archived ${productDocs.length} products and deleted ${storeDocs.length} stores.`);
      return;
    }

    const batch = db.batch();
    for (const store of demoStores) {
      batch.set(db.collection('sellerStores').doc(store.sellerId), { ...store, updatedAt: now }, { merge: true });
    }
    for (const item of demoProducts) {
      batch.set(db.collection('products').doc(item.id), { ...item, updatedAt: now }, { merge: true });
    }
    await batch.commit();
    console.log(`Demo seed completed: wrote ${demoStores.length} stores and ${demoProducts.length} active products to ${projectId}.`);
  } catch (error) {
    if (!shouldApply) throw error;
    console.warn('Admin SDK seed failed; trying Firestore REST fallback with gcloud access token.');
    console.warn(error instanceof Error ? error.message : error);
    await applyWithRest(projectId, now);
  }

  async function listPrefixedDocs(db: FirebaseFirestore.Firestore, collectionName: string) {
    const snapshot = await db
      .collection(collectionName)
      .where(FieldPath.documentId(), '>=', DEMO_PREFIX)
      .where(FieldPath.documentId(), '<', `${DEMO_PREFIX}\uf8ff`)
      .get();
    return snapshot.docs;
  }
}

function printSummary() {
  const byCategory = new Map<string, number>();
  const byStore = new Map<string, number>();
  for (const item of demoProducts) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    byStore.set(item.sellerId, (byStore.get(item.sellerId) ?? 0) + 1);
  }

  console.log(`Hackathon demo catalog: ${demoStores.length} stores, ${demoProducts.length} products.`);
  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${shouldApply ? 'apply' : shouldReset ? 'reset-demo' : 'dry-run'}`);
  console.log(`Categories: ${Array.from(byCategory.entries()).map(([key, count]) => `${key}=${count}`).join(', ')}`);
  console.log(`Stores: ${Array.from(byStore.entries()).map(([key, count]) => `${key}=${count}`).join(', ')}`);
  console.log('Sample products:');
  for (const item of demoProducts.slice(0, 6)) {
    console.log(`- ${item.id} | ${item.seller} | ${item.title} | ${item.price} TL`);
  }
}

function getArgValue(name: string) {
  const rawArgs = process.argv.slice(2);
  const index = rawArgs.indexOf(name);
  if (index >= 0) return rawArgs[index + 1];
  const prefixed = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  return prefixed?.slice(name.length + 1);
}

async function applyWithRest(projectId: string, now: string) {
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const writes = [
    ...demoStores.map((store) => createRestWrite(projectId, 'sellerStores', store.sellerId, { ...store, updatedAt: now })),
    ...demoProducts.map((item) => createRestWrite(projectId, 'products', item.id, { ...item, updatedAt: now })),
  ];

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    throw new Error(`Firestore REST seed failed with ${response.status}: ${await response.text()}`);
  }

  const result = await response.json() as { status?: Array<{ code?: number; message?: string }> };
  const failures = result.status?.filter((status) => status.code && status.code !== 0) ?? [];
  if (failures.length > 0) {
    throw new Error(`Firestore REST seed had ${failures.length} failed writes: ${JSON.stringify(failures.slice(0, 3))}`);
  }

  console.log(`Demo seed completed with REST fallback: wrote ${demoStores.length} stores and ${demoProducts.length} active products to ${projectId}.`);
}

function createRestWrite(projectId: string, collectionName: string, docId: string, data: Record<string, unknown>) {
  return {
    update: {
      name: `projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`,
      fields: toFirestoreFields(data),
    },
  };
}

function toFirestoreFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value === 'undefined') return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}
