import { router } from 'expo-router';
import { ArrowLeft, Heart, Sparkles } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { getFitRecommendation } from '@/services/fit';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { Product, RecommendationResult } from '@/types';

export default function FavoritesScreen() {
  const {
    catalog,
    recommendations,
    profile,
    selectedProduct,
    favoriteProductIds,
    analyticsEvents,
    userSettings,
    selectProduct,
    addToCart,
    isFavorite,
    toggleFavorite,
    logEvent,
  } = useAppState();
  const activeCatalog = useMemo(
    () => catalog.filter((product) => (product.status ?? 'active') !== 'archived'),
    [catalog],
  );
  const favoriteProducts = activeCatalog.filter((product) => favoriteProductIds.includes(product.id));
  const recommendationByProductId = useMemo(
    () => new Map(recommendations.map((recommendation) => [recommendation.product.id, recommendation])),
    [recommendations],
  );
  const recentProducts = useMemo(() => {
    if (!userSettings.privacy.personalizationEnabled) return [];
    const ids = analyticsEvents
      .filter((event) => event.name === 'product_detail_opened' && typeof event.metadata?.productId === 'string')
      .map((event) => event.metadata?.productId as string)
      .reverse();
    return Array.from(new Set(ids))
      .map((id) => activeCatalog.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product))
      .slice(0, 4);
  }, [activeCatalog, analyticsEvents, userSettings.privacy.personalizationEnabled]);
  const fallbackProducts = recommendations.map((item) => item.product).filter((product) => (product.status ?? 'active') !== 'archived').slice(0, 4);

  useEffect(() => {
    logEvent('favorites_opened', { favoriteCount: favoriteProducts.length });
  }, []);

  function toRecommendation(product: Product): RecommendationResult {
    return recommendationByProductId.get(product.id) ?? {
      product,
      matchScore: Math.min(98, Math.max(50, product.visibilityScore)),
      highlights: ['favori sinyali'],
      reason: `${product.title}, favori veya son baktığın ürünler içinde yer alıyor.`,
    };
  }

  function openDetails(product: Product) {
    selectProduct(product.id);
    logEvent('product_detail_opened', { productId: product.id, source: 'favorites' });
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }

  function addProduct(product: Product) {
    selectProduct(product.id);
    addToCart(product.id);
    router.push('/checkout');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Favorilerim</Text>
          <Text style={styles.headerSubtitle}>{favoriteProducts.length} favori ürün</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {favoriteProducts.length > 0 ? (
          <>
            <SectionTitle icon={<Heart size={16} color={colors.coral} fill={colors.coral} />} title="Kaydedilen ürünler" />
            <ProductGrid products={favoriteProducts} selectedProduct={selectedProduct} toRecommendation={toRecommendation} onDetails={openDetails} onAdd={addProduct} />
          </>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Heart size={22} color={colors.coral} />
            </View>
            <Text style={styles.emptyTitle}>Henüz favori yok</Text>
            <Text style={styles.emptyBody}>Beğendiğin ürünleri kaydet; sonra buradan hızlıca karşılaştırıp satın al.</Text>
          </View>
        )}

        {recentProducts.length > 0 ? (
          <>
            <SectionTitle icon={<Sparkles size={16} color={colors.ai} />} title="Son baktıkların" />
            <ProductGrid products={recentProducts} selectedProduct={selectedProduct} toRecommendation={toRecommendation} onDetails={openDetails} onAdd={addProduct} />
          </>
        ) : null}

        {favoriteProducts.length === 0 ? (
          <>
            <SectionTitle icon={<Sparkles size={16} color={colors.ai} />} title="AI tekrar dene önerileri" />
            <ProductGrid products={fallbackProducts} selectedProduct={selectedProduct} toRecommendation={toRecommendation} onDetails={openDetails} onAdd={addProduct} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );

  function ProductGrid({
    products,
    selectedProduct,
    toRecommendation,
    onDetails,
    onAdd,
  }: {
    products: Product[];
    selectedProduct: Product;
    toRecommendation: (product: Product) => RecommendationResult;
    onDetails: (product: Product) => void;
    onAdd: (product: Product) => void;
  }) {
    return (
      <View style={styles.grid}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            recommendation={toRecommendation(product)}
            active={product.id === selectedProduct.id}
            fitRecommendation={getFitRecommendation(product, profile)}
            isFavorite={isFavorite(product.id)}
            onToggleFavorite={(item) => toggleFavorite(item.id)}
            onSelect={(item) => selectProduct(item.id)}
            onDetails={onDetails}
            onTryOn={(item) => {
              selectProduct(item.id);
              router.push('/try-on');
            }}
            onAddToCart={onAdd}
          />
        ))}
      </View>
    );
  }
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
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
  emptyCard: {
    borderRadius: 16,
    backgroundColor: colors.tile,
    padding: 16,
    gap: 8,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
});
