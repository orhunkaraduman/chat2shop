import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

loadDotEnv();

const requiredKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];
const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.log('Firebase config missing. App will use local fallback mode.');
  console.log(`Missing keys: ${missingKeys.join(', ')}`);
  process.exit(0);
}

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string,
});

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log(`Firebase config loaded for project: ${app.options.projectId}`);
console.log(`Auth domain: ${auth.config.authDomain}`);
console.log(`Storage bucket: ${storage.app.options.storageBucket}`);

if (!process.argv.includes('--ping')) {
  console.log('Initialization check passed. Use --ping to test Firestore read access.');
  process.exit(0);
}

getDocs(query(collection(db, 'products'), where('status', '==', 'active'), limit(1)))
  .then((snapshot) => {
    console.log(`Firestore ping passed. Products preview count: ${snapshot.size}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Firestore ping failed. Check config, Firestore enablement, and rules.');
    console.error(error);
    process.exit(1);
  });

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
