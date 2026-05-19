import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
} = FirebaseAuth;

type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;
type AuthPersistence = NonNullable<AuthDependencies['persistence']>;

const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => AuthPersistence;
  }
).getReactNativePersistence;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Object.values(firebaseConfig).every((value) => Boolean(value));

const firebaseOptions = firebaseEnabled
  ? {
      apiKey: firebaseConfig.apiKey as string,
      authDomain: firebaseConfig.authDomain as string,
      projectId: firebaseConfig.projectId as string,
      storageBucket: firebaseConfig.storageBucket as string,
      messagingSenderId: firebaseConfig.messagingSenderId as string,
      appId: firebaseConfig.appId as string,
    }
  : undefined;

const app = firebaseOptions ? (getApps().length > 0 ? getApp() : initializeApp(firebaseOptions)) : undefined;
let emulatorsConnected = false;

export const firebaseApp = app;
export const firebaseAuth = app ? initializeFirebaseAuth(app) : undefined;
export const firestoreDb = app ? getFirestore(app) : undefined;
export const firebaseStorage = app ? getStorage(app) : undefined;

connectFirebaseEmulators();

function initializeFirebaseAuth(firebaseApp: NonNullable<typeof app>) {
  try {
    return initializeAuth(firebaseApp, {
      persistence: Platform.OS === 'web' && isBrowserRuntime()
        ? [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence]
        : getReactNativePersistence?.(AsyncStorage) ?? inMemoryPersistence,
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

function isBrowserRuntime() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function connectFirebaseEmulators() {
  if (!firebaseEnabled || emulatorsConnected || process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS !== 'true') {
    return;
  }

  const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  const authPort = Number(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099);
  const firestorePort = Number(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT || 8080);
  const storagePort = Number(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || 9199);

  try {
    if (firebaseAuth) {
      connectAuthEmulator(firebaseAuth, `http://${host}:${authPort}`, { disableWarnings: true });
    }
    if (firestoreDb) {
      connectFirestoreEmulator(firestoreDb, host, firestorePort);
    }
    if (firebaseStorage) {
      connectStorageEmulator(firebaseStorage, host, storagePort);
    }
    emulatorsConnected = true;
  } catch {
    // Firebase throws on duplicate emulator connections during fast refresh.
    emulatorsConnected = true;
  }
}
