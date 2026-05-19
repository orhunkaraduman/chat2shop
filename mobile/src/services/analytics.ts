import { AnalyticsEvent, AnalyticsEventName, SearchAnalyticsEventType, SearchAnalyticsRecord } from '@/types';

export function createAnalyticsEvent(
  name: AnalyticsEventName,
  metadata?: AnalyticsEvent['metadata'],
): AnalyticsEvent {
  return {
    id: `${Date.now()}-${name}-${Math.random().toString(36).slice(2)}`,
    name,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function countEvents(events: AnalyticsEvent[], name: AnalyticsEventName) {
  return events.filter((event) => event.name === name).length;
}

export function topEventName(events: AnalyticsEvent[]) {
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.name] = (acc[event.name] ?? 0) + 1;
    return acc;
  }, {});
  const [name] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['no_events'];
  return name;
}

export function createSearchAnalyticsRecord(
  eventType: SearchAnalyticsEventType,
  input: Omit<SearchAnalyticsRecord, 'id' | 'eventType' | 'createdAt'>,
): SearchAnalyticsRecord {
  return {
    id: `${Date.now()}-${eventType}-${Math.random().toString(36).slice(2)}`,
    origin: 'client',
    eventType,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export function getBehaviorBoostForProduct(events: AnalyticsEvent[], productId: string, query?: string) {
  const normalizedQuery = typeof query === 'string' ? normalize(query) : undefined;
  let detailViews = 0;
  let addToCarts = 0;
  let tryOns = 0;
  let purchases = 0;

  events.forEach((event) => {
    if (typeof event.metadata?.productId !== 'string' || event.metadata.productId !== productId) {
      return;
    }
    if (typeof event.metadata?.searchId !== 'string') {
      return;
    }
    if (
      normalizedQuery &&
      typeof event.metadata?.query === 'string' &&
      normalize(event.metadata.query) !== normalizedQuery
    ) {
      return;
    }

    if (event.name === 'product_detail_opened') detailViews += 1;
    if (event.name === 'add_to_cart') addToCarts += 1;
    if (event.name === 'try_on_opened') tryOns += 1;
    if (event.name === 'purchase_completed') purchases += 1;
  });

  const boost = Math.min(12, detailViews + addToCarts * 4 + tryOns * 3 + purchases * 6);
  const reasons: string[] = [];
  if (purchases > 0) reasons.push('benzer aramalarda satın alma dönüşümü var');
  if (addToCarts > 0) reasons.push('benzer aramalarda sepete ekleniyor');
  if (tryOns > 0) reasons.push('try-on etkileşimi aldı');
  if (detailViews >= 3) reasons.push('tekrar açılan ürün sinyali güçlü');

  return {
    boost,
    reasons,
    detailViews,
    addToCarts,
    tryOns,
    purchases,
  };
}

export function summarizeSearchAnalytics(events: AnalyticsEvent[]) {
  const queryCounts = new Map<string, number>();
  const zeroResultQueries = new Map<string, number>();
  const queryFunnel = new Map<
    string,
    {
      searches: number;
      resultLoads: number;
      details: number;
      carts: number;
      tryOns: number;
      purchases: number;
    }
  >();
  const uniqueSearches = new Set<string>();
  const searchesWithResults = new Set<string>();
  const searchesWithDetail = new Set<string>();
  const searchesWithCart = new Set<string>();
  const searchesWithPurchase = new Set<string>();
  let zeroResultCount = 0;
  let detailFromSearchCount = 0;
  let addToCartFromSearchCount = 0;
  let tryOnFromSearchCount = 0;
  let purchaseFromSearchCount = 0;
  let resultLoadedCount = 0;

  events.forEach((event) => {
    if (event.name === 'catalog_search_submitted') {
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.searches += 1;
        queryFunnel.set(query, current);
      }
      if (typeof event.metadata?.searchId === 'string') {
        uniqueSearches.add(event.metadata.searchId);
      }
    }

    if (event.name === 'catalog_search_results_loaded') {
      resultLoadedCount += 1;
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.resultLoads += 1;
        queryFunnel.set(query, current);
      }
      if (typeof event.metadata?.searchId === 'string') {
        searchesWithResults.add(event.metadata.searchId);
      }
    }

    if (event.name === 'catalog_search_zero_results') {
      zeroResultCount += 1;
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        zeroResultQueries.set(query, (zeroResultQueries.get(query) ?? 0) + 1);
      }
    }

    if (event.name === 'product_detail_opened' && typeof event.metadata?.searchId === 'string') {
      detailFromSearchCount += 1;
      searchesWithDetail.add(event.metadata.searchId);
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.details += 1;
        queryFunnel.set(query, current);
      }
    }

    if (event.name === 'add_to_cart' && typeof event.metadata?.searchId === 'string') {
      addToCartFromSearchCount += 1;
      searchesWithCart.add(event.metadata.searchId);
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.carts += 1;
        queryFunnel.set(query, current);
      }
    }

    if (event.name === 'try_on_opened' && typeof event.metadata?.searchId === 'string') {
      tryOnFromSearchCount += 1;
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.tryOns += 1;
        queryFunnel.set(query, current);
      }
    }

    if (event.name === 'purchase_completed' && typeof event.metadata?.searchId === 'string') {
      purchaseFromSearchCount += 1;
      searchesWithPurchase.add(event.metadata.searchId);
      const query = typeof event.metadata?.query === 'string' ? event.metadata.query : '';
      if (query) {
        const current = queryFunnel.get(query) ?? emptyFunnelRow();
        current.purchases += 1;
        queryFunnel.set(query, current);
      }
    }
  });

  return {
    topQueries: Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([query, count]) => ({ query, count })),
    topZeroResultQueries: Array.from(zeroResultQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([query, count]) => ({ query, count })),
    topConvertingQueries: Array.from(queryFunnel.entries())
      .map(([query, counts]) => ({
        query,
        searches: counts.searches,
        purchases: counts.purchases,
        carts: counts.carts,
        conversionRate: counts.searches > 0 ? Math.round((counts.purchases / counts.searches) * 100) : 0,
      }))
      .filter((item) => item.searches > 0 && (item.purchases > 0 || item.carts > 0))
      .sort((a, b) => b.conversionRate - a.conversionRate || b.carts - a.carts)
      .slice(0, 3),
    searchSubmittedCount: uniqueSearches.size || Array.from(queryCounts.values()).reduce((total, count) => total + count, 0),
    resultsLoadedCount: resultLoadedCount,
    zeroResultCount,
    detailFromSearchCount,
    addToCartFromSearchCount,
    tryOnFromSearchCount,
    purchaseFromSearchCount,
    searchToDetailRate: toPercent(searchesWithDetail.size, searchesWithResults.size || uniqueSearches.size),
    detailToCartRate: toPercent(searchesWithCart.size, searchesWithDetail.size),
    cartToPurchaseRate: toPercent(searchesWithPurchase.size, searchesWithCart.size),
  };
}

function emptyFunnelRow() {
  return {
    searches: 0,
    resultLoads: 0,
    details: 0,
    carts: 0,
    tryOns: 0,
    purchases: 0,
  };
}

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').trim();
}
