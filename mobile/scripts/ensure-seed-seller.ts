import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

loadDotEnv();

const email = process.env.FIREBASE_SEED_EMAIL;
const password = process.env.FIREBASE_SEED_PASSWORD;

if (!email || !password) {
  console.log('Seed seller skipped: FIREBASE_SEED_EMAIL and FIREBASE_SEED_PASSWORD are required.');
  process.exit(0);
}
const seedEmail = email;
const seedPassword = password;

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
  console.log(`Seed seller skipped. Missing Firebase keys: ${missingKeys.join(', ')}`);
  process.exit(0);
}

async function main() {
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

  const credential = await signInOrCreateSeller(auth, seedEmail, seedPassword);
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'users', credential.user.uid),
    {
      id: credential.user.uid,
      email: seedEmail,
      role: 'seller',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log(`Seed seller ready: ${seedEmail} (${credential.user.uid})`);
  process.exit(0);
}

async function signInOrCreateSeller(auth: ReturnType<typeof getAuth>, email: string, password: string) {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (isFirebaseError(error, 'auth/email-already-in-use')) {
      return signInWithEmailAndPassword(auth, email, password);
    }
    throw error;
  }
}

function isFirebaseError(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
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
