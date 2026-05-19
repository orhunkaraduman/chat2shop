import { logger } from 'firebase-functions';

import { getDb } from './admin';
import type { ChatFollowUpMode } from './types';

type SearchAnalyticsInput = {
  userId?: string;
  source: 'catalog' | 'chat';
  eventType:
    | 'server_catalog_search_executed'
    | 'server_chat_recommend_executed'
    | 'server_search_zero_results'
    | 'server_search_fallback_used';
  query?: string;
  searchId?: string;
  mode?: ChatFollowUpMode;
  anchorProductId?: string;
  resultCount?: number;
  resultIds?: string[];
  filters?: Record<string, string | number | boolean>;
  durationMs?: number;
  aiMode?: 'gemini' | 'mock-fallback';
  fallbackReason?: string;
};

export async function recordServerSearchEvent(input: SearchAnalyticsInput) {
  if (process.env.ENABLE_SERVER_SEARCH_ANALYTICS === 'false') return;

  const id = `${Date.now()}-${input.eventType}-${Math.random().toString(36).slice(2)}`;
  const record = stripUndefined({
    id,
    origin: 'server',
    sessionId: `server-${input.userId ?? 'anonymous'}`,
    createdAt: new Date().toISOString(),
    ...input,
  });

  try {
    await getDb().collection('searchEvents').doc(id).set(record);
  } catch (error) {
    logger.warn('Server search analytics write failed.', {
      eventType: input.eventType,
      searchId: input.searchId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => typeof item !== 'undefined')
        .map(([key, item]) => [key, stripUndefined(item)]),
    ) as T;
  }

  return value;
}
