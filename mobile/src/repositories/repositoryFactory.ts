import { firebaseEnabled } from '@/config/firebase';

import { createFirebaseRepositories } from './firebaseRepositories';
import { createLocalRepositories } from './localRepositories';
import { AppRepositories } from './types';

let repositories: AppRepositories | undefined;

export function getRepositories() {
  if (!repositories) {
    repositories = firebaseEnabled ? createFirebaseRepositories() : createLocalRepositories();
  }

  return repositories;
}
