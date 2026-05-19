import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

if (getApps().length === 0) {
  initializeApp();
}

export async function verifyAuthIfRequired(request: RequestLike) {
  if (!isFirebaseAuthRequired()) {
    return { uid: undefined };
  }

  return verifyRequiredAuth(request);
}

export async function verifyRequiredAuth(request: RequestLike) {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    throw new HttpError(401, 'Missing Firebase ID token.');
  }

  const decoded = await getAuth().verifyIdToken(token);
  return { uid: decoded.uid };
}

export function assertRateLimit(request: RequestLike) {
  const limit = getNumberEnv('AI_ENDPOINT_RATE_LIMIT', getNumberEnv('AI_PRODUCT_INTELLIGENCE_RATE_LIMIT', 30));
  const windowMs = getNumberEnv(
    'AI_ENDPOINT_RATE_WINDOW_MS',
    getNumberEnv('AI_PRODUCT_INTELLIGENCE_RATE_WINDOW_MS', 60_000),
  );
  const key = getClientKey(request);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new HttpError(429, 'Rate limit exceeded.');
  }

  bucket.count += 1;
}

export function isFirebaseAuthRequired() {
  return process.env.REQUIRE_FIREBASE_AUTH === 'true';
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function getBearerToken(value: string | string[] | undefined) {
  const authorization = Array.isArray(value) ? value[0] : value;
  if (!authorization?.startsWith('Bearer ')) return undefined;
  return authorization.slice('Bearer '.length).trim();
}

function getClientKey(request: RequestLike) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return forwarded?.split(',')[0]?.trim() || request.ip || 'anonymous';
}

function getNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
