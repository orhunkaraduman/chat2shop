import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

import { products } from '../src/data/mockData';
import { Product } from '../src/types';

const dryRun = process.argv.includes('--dry-run');
loadDotEnv();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const firebaseEnabled = Object.values(firebaseConfig).every(Boolean);
const seedEmail = process.env.FIREBASE_SEED_EMAIL;
const seedPassword = process.env.FIREBASE_SEED_PASSWORD;
const now = new Date().toISOString();
const seedProducts: Product[] = products.map((product) => ({
  ...product,
  status: product.status ?? 'active',
  source: product.source ?? 'mock',
  createdAt: product.createdAt ?? now,
  updatedAt: now,
}));

if (dryRun) {
  console.log(`Firebase seed dry-run: ${seedProducts.length} products ready.`);
  console.log(seedProducts.slice(0, 3).map((product) => `${product.id} -> ${product.title}`).join('\n'));
  process.exit(0);
}

if (!firebaseEnabled) {
  console.log('Firebase seed skipped: EXPO_PUBLIC_FIREBASE_* config is missing.');
  process.exit(0);
}

async function main() {
  const app = initializeApp({
    apiKey: firebaseConfig.apiKey as string,
    authDomain: firebaseConfig.authDomain as string,
    projectId: firebaseConfig.projectId as string,
    storageBucket: firebaseConfig.storageBucket as string,
    messagingSenderId: firebaseConfig.messagingSenderId as string,
    appId: firebaseConfig.appId as string,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (!seedEmail || !seedPassword) {
    console.log('Firebase seed skipped: FIREBASE_SEED_EMAIL and FIREBASE_SEED_PASSWORD are required.');
    console.log('Create/sign in as a seller user first, then add those values to mobile/.env.');
    process.exit(0);
  }

  const credential = await signInWithEmailAndPassword(auth, seedEmail, seedPassword);
  const sellerId = credential.user.uid;
  const productsWithSeller = seedProducts.map((product) => ({
    ...product,
    sellerId,
    updatedAt: now,
  }));

  await Promise.all(
    productsWithSeller.map((product) => setDoc(doc(db, 'products', product.id), product, { merge: true })),
  );
  console.log(`Firebase seed completed: ${productsWithSeller.length} products written as seller ${sellerId}.`);
  process.exit(0);
}

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
