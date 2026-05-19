import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck, Star, Truck } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { ProductCard } from '@/components/ProductCard';
import { getFitRecommendation } from '@/services/fit';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { Product, RecommendationResult, SellerStore } from '@/types';

export default function PublicStoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    catalog,
    recommendations,
    profile,
    selectedProduct,
    selectProduct,
    addToCart,
    isFavorite,
    toggleFavorite,
    loadSellerStoreById,
    logEvent,
  } = useAppState();
  const storeProducts = useMemo(
    () => catalog.filter((product) => product.sellerId === id && (product.status ?? 'active') !== 'archived'),
    [catalog, id],
  );
  const fallbackProduct = storeProducts[0] ?? catalog.find((product) => product.sellerId === id);
  const [store, setStore] = useState<SellerStore | undefined>();
  const storeName = store?.name ?? fallbackProduct?.seller ?? 'Chat2Shop Mağaza';
  const averageVisibility =
    storeProducts.length > 0
      ? Math.round(storeProducts.reduce((total, product) => total + product.visibilityScore, 0) / storeProducts.length)
      : 0;
  const recommendationByProductId = useMemo(
    () => new Map(recommendations.map((recommendation) => [recommendation.product.id, recommendation])),
    [recommendations],
  );

  useEffect(() => {
    if (!id) return;
    logEvent('store_detail_opened', { sellerId: id });
    void loadSellerStoreById(id).then(setStore);
  }, [id]);

  function toRecommendation(product: Product): RecommendationResult {
    return recommendationByProductId.get(product.id) ?? {
      product,
      matchScore: Math.min(98, Math.max(55, product.visibilityScore)),
      highlights: ['mağaza kataloğunda aktif ürün'],
      reason: `${product.title}, ${storeName} mağazasındaki aktif ürünlerden biri.`,
    };
  }

  function openDetails(product: Product) {
    selectProduct(product.id);
    logEvent('product_detail_opened', { productId: product.id, source: 'store' });
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
        <Text style={styles.headerTitle}>Mağaza</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          {store?.coverUrl ? <Image source={{ uri: store.coverUrl }} style={styles.coverImage} resizeMode="cover" /> : null}
          {store?.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={styles.logoImage} resizeMode="cover" />
          ) : (
            <BrandLogo size={58} framed backgroundColor={colors.trustSoft} style={styles.logo} />
          )}
          <Text style={styles.title}>{storeName}</Text>
          <Text style={styles.body}>
            {store?.description ?? 'Chat2Shop içinde AI öneri sistemine hazır moda mağazası.'}
          </Text>
          <View style={styles.badgeRow}>
            {(store?.trustBadges?.length ? store.trustBadges : store?.badges?.length ? store.badges : ['Güvenilir satıcı', 'AI-ready catalog']).slice(0, 3).map((badge) => (
              <View key={badge} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
          {store?.supportEmail || store?.supportPhone ? (
            <Text style={styles.body}>
              {store.supportEmail ?? ''} {store.supportPhone ? `· ${store.supportPhone}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.metricGrid}>
          <MetricTile icon={<Star size={16} color={colors.yellow} fill={colors.yellow} />} label="Puan" value={(store?.rating ?? 4.7).toFixed(1)} />
          <MetricTile icon={<ShieldCheck size={16} color={colors.ai} />} label="AI visibility" value={averageVisibility ? `${averageVisibility}/100` : '-'} />
          <MetricTile icon={<Truck size={16} color={colors.info} />} label="Kargo" value={store?.shippingTime ?? '2-4 iş günü'} />
          <MetricTile icon={<ShieldCheck size={16} color={colors.trust} />} label="İade" value={store?.returnPolicy ?? '14 gün'} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mağaza ürünleri</Text>
          <Text style={styles.sectionMeta}>{storeProducts.length} aktif ürün</Text>
        </View>

        {storeProducts.length > 0 ? (
          <View style={styles.grid}>
            {storeProducts.map((product) => (
              <ProductCard
                key={product.id}
                recommendation={toRecommendation(product)}
                active={product.id === selectedProduct.id}
                fitRecommendation={getFitRecommendation(product, profile)}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={(item) => toggleFavorite(item.id)}
                onSelect={(item) => selectProduct(item.id)}
                onDetails={openDetails}
                onTryOn={(item) => {
                  selectProduct(item.id);
                  router.push('/try-on');
                }}
                onAddToCart={addProduct}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Henüz aktif ürün yok</Text>
            <Text style={styles.body}>Bu mağaza ürün yayınladığında burada görünecek.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      {icon}
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    paddingBottom: 34,
    gap: 14,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: colors.tile,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 22,
  },
  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 22,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 84,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 5,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
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
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
