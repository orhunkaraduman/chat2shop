import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FadeInImage } from '@/components/FadeInImage';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice, getCategoryAccent } from '@/theme';
import {
  AnalyticsEvent,
  Category,
  Product,
  RecommendationResult,
  SellerOrder,
  StyleProfile,
} from '@/types';

const promptSuggestions = [
  {
    label: 'Ofis smart casual',
    prompt: 'Ofis için rahat ama profesyonel smart casual bir kombin öner.',
  },
  {
    label: 'Koşu',
    prompt: 'Koşu için rahat, nefes alan ve şık spor parçalar öner.',
  },
  {
    label: 'Hafta sonu',
    prompt: 'Hafta sonu için rahat, sade ve kolay kombinlenen parçalar öner.',
  },
  {
    label: 'Romantik date',
    prompt: 'Romantik bir date için zarif ama abartısız bir elbise öner.',
  },
  {
    label: 'Düğün daveti',
    prompt: 'Düğün daveti için şık, zarif ve dengeli bir kombin öner.',
  },
  {
    label: 'Sneaker kombini',
    prompt: 'Beyaz sneaker ile uyumlu sade ve günlük bir kombin oluştur.',
  },
];

const actionItems = promptSuggestions;

const categoryLabels: Record<Category, string> = {
  dress: 'Elbise',
  shirt: 'Gömlek',
  pants: 'Pantolon',
  jacket: 'Ceket',
  shoes: 'Ayakkabı',
  bag: 'Çanta',
  accessory: 'Aksesuar',
};

const preferredCategoryProducts: Partial<Record<Category, string>> = {
  dress: 'black-midi-dress',
  shirt: 'white-oversize-shirt',
  pants: 'cream-wide-leg-pants',
  jacket: 'classic-trench-coat',
  shoes: 'white-minimal-sneaker',
};

export default function ExploreScreen() {
  const {
    catalog,
    recommendations,
    profile,
    favoriteProductIds,
    buyerSellerOrders,
    analyticsEvents,
    userSettings,
    selectProduct,
    submitChatPrompt,
    isFavorite,
    toggleFavorite,
    logEvent,
  } = useAppState();

  const activeCatalog = useMemo(
    () => catalog.filter((product) => product.status !== 'archived'),
    [catalog],
  );

  const categoryItems = useMemo(() => {
    const categories: Category[] = ['dress', 'shirt', 'pants', 'jacket', 'shoes'];
    return categories
      .map((category) => {
        const preferredId = preferredCategoryProducts[category];
        return (
          activeCatalog.find((product) => product.id === preferredId) ??
          activeCatalog.find((product) => product.category === category)
        );
      })
      .filter(Boolean) as Product[];
  }, [activeCatalog]);

  const recommendationByProductId = useMemo(() => {
    return new Map(recommendations.map((recommendation) => [recommendation.product.id, recommendation]));
  }, [recommendations]);

  const assistantPreview = useMemo(() => {
    const personalizationEnabled = userSettings.privacy.personalizationEnabled;
    return buildAssistantPreview({
      analyticsEvents: personalizationEnabled ? analyticsEvents : [],
      buyerSellerOrders,
      catalog: activeCatalog,
      favoriteProductIds,
      profile,
      recommendations: recommendations.filter((recommendation) => recommendation.product.status !== 'archived'),
    });
  }, [activeCatalog, analyticsEvents, buyerSellerOrders, favoriteProductIds, profile, recommendations, userSettings.privacy.personalizationEnabled]);

  const aiPickProducts = useMemo(() => {
    const recommendationProducts = recommendations
      .filter((recommendation) => recommendation.product.status !== 'archived')
      .map((recommendation) => recommendation.product);
    const highSignalFallback = [...activeCatalog].sort((a, b) => b.visibilityScore - a.visibilityScore);
    return pickUniqueProducts([...recommendationProducts, ...highSignalFallback], { limit: 4 });
  }, [activeCatalog, recommendations]);

  const popularProducts = useMemo(() => {
    const excluded = buildProductExclusion(aiPickProducts);
    return pickUniqueProducts([...activeCatalog]
      .sort((a, b) => {
        const aScore = a.sellerReliability + a.visibilityScore + Math.min(a.stock, 30);
        const bScore = b.sellerReliability + b.visibilityScore + Math.min(b.stock, 30);
        return bScore - aScore;
      }), {
        excludeIds: excluded.ids,
        excludeImageKeys: excluded.imageKeys,
        limit: 8,
      });
  }, [activeCatalog, aiPickProducts]);

  const newIn = useMemo(() => {
    const excluded = buildProductExclusion([...aiPickProducts, ...popularProducts]);
    return pickUniqueProducts([...activeCatalog].reverse(), {
      excludeIds: excluded.ids,
      excludeImageKeys: excluded.imageKeys,
      limit: 6,
    });
  }, [activeCatalog, aiPickProducts, popularProducts]);

  function submit(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    submitChatPrompt(trimmed);
    router.push('/chat');
  }

  function openDetails(product: Product) {
    selectProduct(product.id);
    logEvent('product_detail_opened', { productId: product.id, source: 'explore' });
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }

  return (
    <Screen includeBottomInset={false}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedEntrance delay={0}>
          <View style={styles.assistantEntry}>
            <View style={styles.chatBubble}>
              <Text style={styles.chatSpeaker}>C2S Asistan</Text>
              <Text style={styles.assistantMessage}>
                {assistantPreview.message}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Asistan önerisini kabul et"
              style={styles.replyBubble}
              onPress={() => submit(assistantPreview.replyPrompt)}
            >
              <View style={styles.replyDot} />
              <View style={styles.replyDot} />
              <View style={styles.replyDot} />
            </Pressable>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={70}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRail}>
            {actionItems.map((item) => (
              <Pressable key={item.label} style={styles.actionChip} onPress={() => submit(item.prompt)}>
                <Text style={styles.actionText} numberOfLines={1}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </AnimatedEntrance>

        <AnimatedEntrance delay={120}>
          <SectionHeader
            title="Sana göre seçtik"
            subtitle="Beden ve stil sinyallerine göre"
            action="Tümünü Gör"
            onAction={() => router.push({ pathname: '/catalog', params: { section: 'ai' } })}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {aiPickProducts.map((product) => (
              <RailProduct
                key={product.id}
                product={product}
                recommendation={recommendationByProductId.get(product.id)}
                favorite={isFavorite(product.id)}
                onFavorite={() => toggleFavorite(product.id)}
                onPress={() => openDetails(product)}
              />
            ))}
          </ScrollView>
        </AnimatedEntrance>

        <AnimatedEntrance delay={180}>
          <SectionHeader
            title="Alışverişe başla"
            subtitle="Kategoriye göre keşfet"
            action="Tümünü Gör"
            onAction={() => router.push('/catalog')}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categoryItems.map((product) => {
              const accent = getCategoryAccent(product.category);

              return (
                <Pressable
                key={product.category}
                style={styles.categoryItem}
                onPress={() => router.push({ pathname: '/catalog', params: { category: product.category } })}
              >
                <View style={[styles.categoryImageWrap, { borderColor: accent.accent, backgroundColor: accent.soft }]}>
                  <FadeInImage source={{ uri: product.imageUrl }} style={styles.categoryImage} resizeMode="cover" />
                </View>
                <Text style={styles.categoryText} numberOfLines={1}>{categoryLabels[product.category]}</Text>
              </Pressable>
              );
            })}
          </ScrollView>
        </AnimatedEntrance>

        <AnimatedEntrance delay={240}>
          <SectionHeader
            title="Popüler Ürünler"
            subtitle="Son dönemde öne çıkanlar"
            action="Tümünü Gör"
            onAction={() => router.push({ pathname: '/catalog', params: { section: 'popular' } })}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {popularProducts.map((product) => (
              <RailProduct
                key={product.id}
                product={product}
                recommendation={recommendationByProductId.get(product.id)}
                favorite={isFavorite(product.id)}
                onFavorite={() => toggleFavorite(product.id)}
                onPress={() => openDetails(product)}
              />
            ))}
          </ScrollView>
        </AnimatedEntrance>

        <AnimatedEntrance delay={300}>
          <SectionHeader
            title="Yeni Gelenler"
            subtitle="Kataloğa yeni eklenen parçalar"
            action="Tümünü Gör"
            onAction={() => router.push({ pathname: '/catalog', params: { section: 'new' } })}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {newIn.map((product) => (
              <RailProduct
                key={product.id}
                product={product}
                recommendation={recommendationByProductId.get(product.id)}
                favorite={isFavorite(product.id)}
                onFavorite={() => toggleFavorite(product.id)}
                onPress={() => openDetails(product)}
              />
            ))}
          </ScrollView>
        </AnimatedEntrance>
      </ScrollView>
    </Screen>
  );
}

type AssistantPreview = {
  message: string;
  replyPrompt: string;
};

function buildAssistantPreview({
  analyticsEvents,
  buyerSellerOrders,
  catalog,
  favoriteProductIds,
  profile,
  recommendations,
}: {
  analyticsEvents: AnalyticsEvent[];
  buyerSellerOrders: SellerOrder[];
  catalog: Product[];
  favoriteProductIds: string[];
  profile: StyleProfile;
  recommendations: RecommendationResult[];
}): AssistantPreview {
  const latestOrder = [...buyerSellerOrders].sort(compareNewest).find((order) => order.items[0]);
  if (latestOrder) {
    const title = compactTitle(latestOrder.items[0].title);
    const statusText = getOrderStatusText(latestOrder.status);
    return {
      message: `Hoş geldin. ${title} siparişin ${statusText}. Bu parçaya uyumlu kombin önerileri hazırlayayım mı?`,
      replyPrompt: `Evet, ${title} ürünüyle uyumlu kombin önerileri hazırla.`,
    };
  }

  const favoriteProduct = [...favoriteProductIds]
    .reverse()
    .map((productId) => catalog.find((product) => product.id === productId))
    .find(Boolean);

  if (favoriteProduct) {
    const title = compactTitle(favoriteProduct.title);
    return {
      message: `Favorilerine eklediğin ${title} için daha sade ve daha şık alternatifler bulabilirim. Nasıl ilerleyelim?`,
      replyPrompt: `Evet, ${title} için daha sade ve daha şık alternatifleri göster.`,
    };
  }

  const recentProductId = [...analyticsEvents]
    .reverse()
    .find((event) => event.name === 'product_detail_opened' && typeof event.metadata?.productId === 'string')
    ?.metadata?.productId;
  const recentProduct =
    typeof recentProductId === 'string'
      ? catalog.find((product) => product.id === recentProductId)
      : undefined;

  if (recentProduct) {
    const title = compactTitle(recentProduct.title);
    return {
      message: `Az önce baktığın ${title} ilgini çekmişti. Aynı bütçede benzer ürünleri göstereyim mi?`,
      replyPrompt: `Evet, ${title} ürününe benzer, aynı bütçede alternatifleri göster.`,
    };
  }

  const recommendationProduct = recommendations[0]?.product;
  const style = profile.styles[0] ?? 'minimal';
  const occasion = profile.occasions[0] ?? 'günlük';
  const title = recommendationProduct ? compactTitle(recommendationProduct.title) : undefined;

  return {
    message: title
      ? `Hoş geldin. ${style} stiline yakın ${title} öne çıktı. ${occasion} için kombin önerileri ister misin?`
      : `Hoş geldin. ${style} stiline yakın parçalar seçtim. ${occasion} için kombin önerileriyle başlayabiliriz.`,
    replyPrompt: title
      ? `${title} ürünüyle ${occasion} için kombin öner.`
      : `${style} stilime uygun ${occasion} kombinleri öner.`,
  };
}

function compareNewest(a: { updatedAt?: string; createdAt: string }, b: { updatedAt?: string; createdAt: string }) {
  return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
}

function getOrderStatusText(status: SellerOrder['status']) {
  const statusMap: Record<SellerOrder['status'], string> = {
    new: 'alındı',
    preparing: 'hazırlanıyor',
    shipped: 'kargoya verildi',
    completed: 'teslim edildi',
    issue: 'için kontrol gerekiyor',
  };

  return statusMap[status];
}

function compactTitle(title: string) {
  return title.length > 34 ? `${title.slice(0, 31).trim()}...` : title;
}

function pickUniqueProducts(
  products: Product[],
  options: {
    excludeIds?: Set<string>;
    excludeImageKeys?: Set<string>;
    limit: number;
  },
) {
  const picked: Product[] = [];
  const seenIds = new Set(options.excludeIds ?? []);
  const seenImageKeys = new Set(options.excludeImageKeys ?? []);

  for (const product of products) {
    if (seenIds.has(product.id)) continue;
    const imageKey = getProductImageKey(product);
    if (seenImageKeys.has(imageKey)) continue;

    picked.push(product);
    seenIds.add(product.id);
    seenImageKeys.add(imageKey);

    if (picked.length >= options.limit) break;
  }

  return picked;
}

function buildProductExclusion(products: Product[]) {
  return products.reduce(
    (acc, product) => {
      acc.ids.add(product.id);
      acc.imageKeys.add(getProductImageKey(product));
      return acc;
    },
    {
      ids: new Set<string>(),
      imageKeys: new Set<string>(),
    },
  );
}

function getProductImageKey(product: Product) {
  const raw = product.imageUrl.trim().toLowerCase();
  if (!raw) return `product:${product.id}`;

  try {
    const url = new URL(raw);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return raw.split('?')[0] || `product:${product.id}`;
  }
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function RailProduct({
  product,
  recommendation,
  favorite,
  onFavorite,
  onPress,
}: {
  product: Product;
  recommendation?: RecommendationResult;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
}) {
  const accent = getCategoryAccent(product.category);

  return (
    <AnimatedPressable style={[styles.railCard, { borderColor: accent.soft }]} onPress={onPress}>
      <View style={styles.railImageWrap}>
        <FadeInImage source={{ uri: product.imageUrl }} style={styles.railImage} resizeMode="cover" />
        <AnimatedPressable style={styles.railHeart} scaleTo={0.9} onPress={onFavorite}>
          <Heart size={14} color={favorite ? colors.favorite : colors.inkStrong} fill={favorite ? colors.favorite : 'transparent'} />
        </AnimatedPressable>
      </View>
      <View style={styles.railBody}>
        <View style={[styles.railAccent, { backgroundColor: accent.accent }]} />
        <Text style={styles.railTitle} numberOfLines={2}>{product.title}</Text>
        <View style={styles.railInfoRow}>
          <Text style={styles.railPrice}>{formatPrice(product.price)}</Text>
          <View style={styles.railMetaRow}>
            <Text style={styles.railMeta}>{recommendation ? `%${recommendation.matchScore} uyum` : product.color}</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 17,
  },
  assistantEntry: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 21,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  chatBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    borderRadius: 17,
    borderTopLeftRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 5,
  },
  chatSpeaker: {
    color: colors.ai,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  assistantMessage: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  replyBubble: {
    alignSelf: 'flex-end',
    width: 116,
    minHeight: 39,
    borderWidth: 1,
    borderColor: colors.ai,
    borderRadius: 18,
    borderTopRightRadius: 6,
    backgroundColor: colors.aiSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  replyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ai,
    opacity: 0.3,
  },
  actionRail: {
    gap: 7,
    paddingRight: 4,
  },
  actionChip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  actionText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 12,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  sectionAction: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  categoryRow: {
    gap: 11,
    paddingRight: 4,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 7,
    width: 60,
  },
  categoryImageWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryText: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  productRail: {
    gap: 12,
    paddingRight: 4,
  },
  railCard: {
    width: 148,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  railImageWrap: {
    height: 184,
    backgroundColor: colors.surfaceSubtle,
  },
  railImage: {
    width: '100%',
    height: '100%',
  },
  railHeart: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  railBody: {
    padding: 9,
    gap: 6,
  },
  railAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  railTitle: {
    minHeight: 31,
    color: colors.inkStrong,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  railPrice: {
    minWidth: 48,
    flexShrink: 0,
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  railInfoRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  railMetaRow: {
    maxWidth: 68,
    flexShrink: 1,
    minHeight: 20,
    borderRadius: 10,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railMeta: {
    color: colors.ai,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});
