import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (getApps().length === 0) {
  initializeApp();
}

export function getDb() {
  return getFirestore();
}

export function getBucket() {
  return getStorage().bucket();
}
