import { FieldValue } from 'firebase-admin/firestore';

import { getDb } from './admin';
import { HttpError } from './security';

export type AIUsageAllowance = {
  dateKey: string;
  limit: number;
  used: number;
  remaining: number;
};

const DEFAULT_CHAT_DAILY_LIMIT = 250;
const DEFAULT_USAGE_TIMEZONE = 'Europe/Istanbul';

export async function assertDailyChatAllowance(uid?: string): Promise<AIUsageAllowance | undefined> {
  if (!uid) return undefined;

  const limit = getNumberEnv('CHAT_DAILY_FREE_LIMIT', DEFAULT_CHAT_DAILY_LIMIT);
  const dateKey = getUsageDateKey();
  const ref = getDb().doc(`aiUsage/${uid}/daily/${dateKey}`);

  return getDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? Number(snapshot.data()?.chatCount ?? 0) : 0;

    if (current >= limit) {
      throw new HttpError(429, 'daily_chat_limit_exceeded');
    }

    const next = current + 1;
    transaction.set(
      ref,
      {
        uid,
        dateKey,
        chatCount: next,
        chatLimit: limit,
        updatedAt: FieldValue.serverTimestamp(),
        ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    return {
      dateKey,
      limit,
      used: next,
      remaining: Math.max(0, limit - next),
    };
  });
}

function getUsageDateKey() {
  const timezone = process.env.AI_USAGE_TIMEZONE || DEFAULT_USAGE_TIMEZONE;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
