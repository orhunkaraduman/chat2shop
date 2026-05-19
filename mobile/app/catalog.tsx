import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { scoreCatalogSearchResult, searchCatalogWithRemote, SearchIntentParseResult, CatalogSearchResult as CatalogResult } from '@/services/ai';
import { getBehaviorBoostForProduct } from '@/services/analytics';
import { getFitRecommendation } from '@/services/fit';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { Category, Product, RecommendationResult, SearchContext } from '@/types';

type SortMode = 'ai' | 'priceAsc' | 'priceDesc' | 'new';

const categories: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'dress', label: 'Elbise' },
  { value: 'shirt', label: 'Gömlek' },
  { value: 'pants', label: 'Pantolon' },
  { value: 'jacket', label: 'Ceket' },
  { value: 'shoes', label: 'Ayakkabı' },
  { value: 'bag', label: 'Çanta' },
  { value: 'accessory', label: 'Aksesuar' },
];

const sortModes: Array<{ value: SortMode; label: string }> = [
  { value: 'ai', label: 'AI Match' },
  { value: 'priceAsc', label: 'Fiyat düşük' },
  { value: 'priceDesc', label: 'Fiyat yüksek' },
  { value: 'new', label: 'Yeni' },
];

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ category?: string; section?: string; query?: string }>();
  const {
    catalog,
    recommendations,
    profile,
    selectedProduct,
    recentSearches,
    currentCatalogSearchContext,
    analyticsEvents,
    userSettings,
    selectProduct,
    addToCart,
    submitChatPrompt,
    saveRecentSearch,
    clearRecentSearches,
    setCatalogSearchContext,
    isFavorite,
    toggleFavorite,
    logEvent,
    getAuthToken,
    recordSearchAnalytics,
  } = useAppState();
  const [searchText, setSearchText] = useState(params.query ?? '');
  const [activeQuery, setActiveQuery] = useState(params.query ?? '');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(normalizeCategory(params.category));
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('ai');
  const [aiSearchNote, setAiSearchNote] = useState<string>('');
  const [searchIntentLoading, setSearchIntentLoading] = useState(false);
  const [searchPlan, setSearchPlan] = useState<SearchIntentParseResult | undefined>();
  const [catalogResults, setCatalogResults] = useState<RecommendationResult[]>([]);
  const recommendationByProductId = useMemo(
    () => new Map(recommendations.map((recommendation) => [recommendation.product.id, recommendation])),
    [recommendations],
  );
  const activeCatalog = useMemo(
    () => catalog.filter((product) => (product.status ?? 'active') !== 'archived'),
    [catalog],
  );
  const colorOptions = useMemo(
    () => ['all', ...Array.from(new Set(activeCatalog.map((product) => product.color))).slice(0, 8)],
    [activeCatalog],
  );
  const sizeOptions = useMemo(
    () => ['all', ...Array.from(new Set(activeCatalog.flatMap((product) => product.sizes))).slice(0, 8)],
    [activeCatalog],
  );
  const products = useMemo(() => {
    if (catalogResults.length > 0 || activeQuery.trim() || selectedCategory !== 'all' || selectedColor !== 'all' || selectedSize !== 'all') {
      return catalogResults.map((item) => item.product);
    }

    return activeCatalog.sort((a, b) => sortProducts(a, b, sortMode, recommendationByProductId));
  }, [activeCatalog, activeQuery, catalogResults, recommendationByProductId, selectedCategory, selectedColor, selectedSize, sortMode]);
  const topSearchInsights = useMemo(() => {
    if (!activeQuery.trim() || catalogResults.length === 0) return undefined;
    const leadRecommendation = catalogResults[0];
    const leadProduct = leadRecommendation.product;
    return {
      product: leadProduct,
      reasons: leadRecommendation.highlights.slice(0, 3),
    };
  }, [activeQuery, catalogResults]);

  useEffect(() => {
    logEvent('catalog_opened', {
      category: selectedCategory,
      section: params.section ?? 'all',
    });
  }, []);

  useEffect(() => {
    if (params.query) {
      setSearchText(params.query);
      setActiveQuery(params.query);
    }
  }, [params.query]);

  useEffect(() => {
    void executeCatalogSearch(activeQuery, 'state-change');
  }, [activeCatalog, activeQuery, profile, selectedCategory, selectedColor, selectedSize, sortMode]);

  useEffect(() => {
    logEvent('catalog_filter_changed', {
      category: selectedCategory,
      color: selectedColor,
      size: selectedSize,
      sort: sortMode,
      query: searchText,
      count: products.length,
    });
  }, [selectedCategory, selectedColor, selectedSize, sortMode, searchText]);

  function toRecommendation(product: Product): RecommendationResult {
    const remoteRecommendation = catalogResults.find((item) => item.product.id === product.id);
    const behavior = userSettings.privacy.personalizationEnabled
      ? getBehaviorBoostForProduct(analyticsEvents, product.id, activeQuery)
      : { boost: 0, reasons: [] };
    if (remoteRecommendation) {
      return {
        ...remoteRecommendation,
        matchScore: Math.min(99, remoteRecommendation.matchScore + behavior.boost),
        highlights: Array.from(new Set([...remoteRecommendation.highlights, ...behavior.reasons])).slice(0, 5),
      };
    }
    const searchScore = searchText.trim()
      ? scoreCatalogSearchResult(product, searchText, profile, searchPlan)
      : undefined;
    return recommendationByProductId.get(product.id) ?? {
      product,
      matchScore: Math.min(99, (searchScore?.score ?? Math.max(50, product.visibilityScore)) + behavior.boost),
      highlights: Array.from(new Set([...(searchScore?.reasons ?? ['katalog filtresine uyuyor']), ...behavior.reasons])).slice(0, 5),
      reason: searchScore
        ? `${product.title}, arama niyetin ve profil sinyallerine göre öne çıkarıldı.`
        : `${product.title}, seçili katalog filtrelerine uygun bir ürün.`,
    };
  }

  function openDetails(product: Product) {
    selectProduct(product.id);
    logEvent('product_detail_opened', buildSearchMetadata(currentCatalogSearchContext, product.id, { source: 'catalog' }));
    if (currentCatalogSearchContext?.searchId) {
      recordSearchAnalytics('search_result_product_opened', {
        source: 'catalog',
        query: currentCatalogSearchContext.query,
        searchId: currentCatalogSearchContext.searchId,
        mode: currentCatalogSearchContext.mode,
        productId: product.id,
        resultIds: currentCatalogSearchContext.resultIds,
      });
    }
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }

  function addProduct(product: Product) {
    selectProduct(product.id);
    addToCart(product.id, undefined, buildSearchMetadata(currentCatalogSearchContext, product.id, { source: 'catalog' }));
    router.push('/checkout');
  }

  function updateSearchText(value: string) {
    setSearchText(value);
    if (!value.trim()) {
      setActiveQuery('');
      setAiSearchNote('');
      setSearchPlan(undefined);
    }
  }

  async function executeCatalogSearch(query: string, source: 'submit' | 'state-change' | 'recent-search' | 'route-open') {
    const trimmed = query.trim();
    setSearchIntentLoading(true);
    logEvent('catalog_search_submitted', {
      source,
      query: trimmed || 'all',
      category: selectedCategory,
      color: selectedColor,
      size: selectedSize,
      sort: sortMode,
    });
    recordSearchAnalytics('catalog_search_submitted', {
      source: 'catalog',
      query: trimmed || 'all',
      mode: 'default',
      filters: {
        category: selectedCategory,
        color: selectedColor,
        size: selectedSize,
        sort: sortMode,
      },
    });

    const result = await searchCatalogWithRemote(trimmed, profile, activeCatalog, {
      filters: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        color: selectedColor === 'all' ? undefined : selectedColor,
        size: selectedSize === 'all' ? undefined : selectedSize,
      },
      sort: sortMode,
      page: 0,
      pageSize: 12,
      authToken: await getAuthToken(),
    });

    setSearchPlan({
      intent: result.intent,
      filters: result.filters,
      diagnostics: result.diagnostics,
    });
    setCatalogResults(result.recommendations);
    setAiSearchNote(buildAiSearchNoteFromResult(result));
    setCatalogSearchContext({
      searchId: result.searchId,
      query: trimmed,
      surface: 'catalog',
      source: result.source,
      resultIds: result.recommendations.map((item) => item.product.id),
      mode: result.mode,
      createdAt: new Date().toISOString(),
    });
    if (trimmed) {
      saveRecentSearch(trimmed, result.filters);
    }
    logEvent('catalog_search_results_loaded', {
      searchId: result.searchId,
      query: trimmed || 'all',
      source: result.source,
      resultCount: result.recommendations.length,
    });
    recordSearchAnalytics('catalog_search_results_loaded', {
      source: 'catalog',
      query: trimmed || 'all',
      searchId: result.searchId,
      mode: result.mode,
      resultCount: result.recommendations.length,
      resultIds: result.recommendations.map((item) => item.product.id),
      filters: {
        category: result.filters.category ?? 'all',
        color: result.filters.color ?? 'all',
        size: result.filters.size ?? 'all',
      },
    });
    if (result.recommendations.length === 0) {
      logEvent('catalog_search_zero_results', {
        searchId: result.searchId,
        query: trimmed || 'all',
        source: result.source,
      });
      recordSearchAnalytics('catalog_search_zero_results', {
        source: 'catalog',
        query: trimmed || 'all',
        searchId: result.searchId,
        mode: result.mode,
        resultCount: 0,
      });
    }
    setSearchIntentLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Katalog</Text>
          <Text style={styles.headerSubtitle}>
            {products.length} ürün listeleniyor{searchPlan && searchText.trim() ? ' · AI sıralama aktif' : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.ink} />
          <TextInput
            value={searchText}
            onChangeText={updateSearchText}
            onSubmitEditing={() => setActiveQuery(searchText.trim())}
            placeholder="Ürün, renk, stil veya satıcı ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        {userSettings.privacy.personalizationEnabled && !searchText.trim() && recentSearches.length > 0 ? (
          <View style={styles.recentBlock}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Yakın aramalar</Text>
              <Pressable onPress={clearRecentSearches}>
                <Text style={styles.recentClear}>Temizle</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRail}>
              {recentSearches.map((entry) => (
                <Pressable
                  key={entry.id}
                  style={styles.recentChip}
                  onPress={() => {
                    setSearchText(entry.query);
                    setActiveQuery(entry.query);
                    logEvent('catalog_filter_changed', { source: 'recent-search', query: entry.query });
                  }}
                >
                  <Text style={styles.recentChipText} numberOfLines={1}>{entry.query}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {(searchIntentLoading || aiSearchNote) ? (
          <View style={styles.aiSearchCard}>
            <Text style={styles.aiSearchLabel}>{searchIntentLoading ? 'AI filtreleri uygulanıyor...' : 'AI filtreleri'}</Text>
            {!!aiSearchNote && !searchIntentLoading ? <Text style={styles.aiSearchBody}>{aiSearchNote}</Text> : null}
          </View>
        ) : null}

        {topSearchInsights ? (
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Neden öne çıktı?</Text>
            <Text style={styles.insightTitle} numberOfLines={1}>{topSearchInsights.product.title}</Text>
            <View style={styles.insightChipRow}>
              {topSearchInsights.reasons.map((reason) => (
                <View key={reason} style={styles.insightChip}>
                  <Text style={styles.insightChipText} numberOfLines={1}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <FilterRail
          title="Kategori"
          values={categories}
          selected={selectedCategory}
          onSelect={(value) => setSelectedCategory(value as Category | 'all')}
        />
        <FilterRail
          title="Renk"
          values={colorOptions.map((value) => ({ value, label: value === 'all' ? 'Tümü' : value }))}
          selected={selectedColor}
          onSelect={setSelectedColor}
        />
        <FilterRail
          title="Beden"
          values={sizeOptions.map((value) => ({ value, label: value === 'all' ? 'Tümü' : value }))}
          selected={selectedSize}
          onSelect={setSelectedSize}
        />
        <FilterRail
          title="Sıralama"
          icon={<SlidersHorizontal size={14} color={colors.info} />}
          values={sortModes}
          selected={sortMode}
          onSelect={(value) => setSortMode(value as SortMode)}
        />

        {products.length > 0 ? (
          <View style={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                recommendation={toRecommendation(product)}
                active={product.id === selectedProduct.id}
                fitRecommendation={getFitRecommendation(product, profile)}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={(item) =>
                  toggleFavorite(item.id, buildSearchMetadata(currentCatalogSearchContext, item.id, { source: 'catalog' }))}
                onSelect={(item) => selectProduct(item.id)}
                onDetails={openDetails}
                onTryOn={(item) => {
                  selectProduct(item.id);
                  logEvent('try_on_opened', buildSearchMetadata(currentCatalogSearchContext, item.id, { source: 'catalog' }));
                  if (currentCatalogSearchContext?.searchId) {
                    recordSearchAnalytics('search_result_try_on_opened', {
                      source: 'catalog',
                      query: currentCatalogSearchContext.query,
                      searchId: currentCatalogSearchContext.searchId,
                      mode: currentCatalogSearchContext.mode,
                      productId: item.id,
                      resultIds: currentCatalogSearchContext.resultIds,
                    });
                  }
                  router.push('/try-on');
                }}
                onAddToCart={addProduct}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
            <Text style={styles.emptyBody}>Filtreleri gevşet veya Chat2Shop'a nasıl bir ürün aradığını yaz.</Text>
            <View style={styles.emptyActionRow}>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedColor('all');
                  setSelectedSize('all');
                  setSortMode('ai');
                  setSearchPlan(undefined);
                  setAiSearchNote('');
                }}
              >
                <Text style={styles.secondaryActionText}>Filtreleri sıfırla</Text>
              </Pressable>
              <Pressable
                style={styles.primaryAction}
                onPress={() => {
                  const prompt = searchText.trim() || 'Bana uygun ürünler öner';
                  submitChatPrompt(prompt);
                  router.push('/(tabs)/chat');
                }}
              >
                <Text style={styles.primaryActionText}>Chat'e sor</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterRail<T extends string>({
  title,
  icon,
  values,
  selected,
  onSelect,
}: {
  title: string;
  icon?: ReactNode;
  values: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <View style={styles.filterTitleRow}>
        {icon}
        <Text style={styles.filterTitle}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {values.map((item) => (
          <Pressable
            key={item.value}
            style={[styles.filterChip, selected === item.value && styles.filterChipActive]}
            onPress={() => onSelect(item.value)}
          >
            <Text style={[styles.filterChipText, selected === item.value && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function normalizeCategory(value?: string): Category | 'all' {
  if (
    value === 'dress' ||
    value === 'shirt' ||
    value === 'pants' ||
    value === 'jacket' ||
    value === 'shoes' ||
    value === 'bag' ||
    value === 'accessory'
  ) {
    return value;
  }
  return 'all';
}

function sortProducts(
  a: Product,
  b: Product,
  mode: SortMode,
  recommendationByProductId: Map<string, RecommendationResult>,
) {
  if (mode === 'priceAsc') return a.price - b.price;
  if (mode === 'priceDesc') return b.price - a.price;
  if (mode === 'new') return (b.createdAt ?? b.id).localeCompare(a.createdAt ?? a.id);
  const aScore = recommendationByProductId.get(a.id)?.matchScore ?? a.visibilityScore;
  const bScore = recommendationByProductId.get(b.id)?.matchScore ?? b.visibilityScore;
  return bScore - aScore;
}

function buildAiSearchNoteFromResult(result: CatalogResult) {
  const parts = [
    result.filters.category ? categoryLabel(result.filters.category) : undefined,
    result.filters.color,
    result.filters.size ? `${result.filters.size} beden` : undefined,
    result.filters.occasion ? occasionLabel(result.filters.occasion) : undefined,
  ].filter(Boolean);

  if (parts.length === 0) {
    return result.diagnostics?.fallbackReason ? 'Local filtre mantığıyla sonuçlar güncellendi.' : result.explanation;
  }

  const styleLabel = result.filters.styles.length > 0 ? result.filters.styles.slice(0, 2).join(', ') : undefined;
  const prefix = result.diagnostics?.fallbackReason ? 'Yerel filtre uygulandı' : 'AI niyetine göre filtre ve sıralama uygulandı';
  return `${prefix}: ${[...parts, styleLabel].filter(Boolean).join(' · ')}`;
}

function buildSearchMetadata(
  context: SearchContext | undefined,
  productId: string,
  extra?: Record<string, string | number | boolean>,
) {
  return {
    productId,
    searchId: context?.searchId ?? 'none',
    query: context?.query ?? 'all',
    mode: context?.mode ?? 'default',
    searchSource: context?.source ?? 'local',
    ...extra,
  };
}

function categoryLabel(value: Category) {
  const item = categories.find((category) => category.value === value);
  return item?.label ?? value;
}

function occasionLabel(value: string) {
  const labels: Record<string, string> = {
    graduation: 'Mezuniyet',
    evening: 'Akşam',
    'wedding guest': 'Davet',
    office: 'Ofis',
    daily: 'Günlük',
    holiday: 'Tatil',
    summer: 'Yaz',
    dinner: 'Akşam yemeği',
    sport: 'Spor',
    weekend: 'Hafta sonu',
  };
  return labels[value] ?? value;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 34,
    gap: 14,
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  aiSearchCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  aiSearchLabel: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  aiSearchBody: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  filterGroup: {
    gap: 8,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  filterRail: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  filterChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  recentBlock: {
    gap: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  recentClear: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  recentRail: {
    gap: 8,
    paddingRight: 8,
  },
  recentChip: {
    minHeight: 34,
    maxWidth: 220,
    borderRadius: 17,
    backgroundColor: colors.tile,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  insightLabel: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  insightTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  insightChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  insightChip: {
    borderRadius: 14,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  insightChipText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
});
