import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck, WandSparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { Screen } from '@/components/Screen';
import { getFitRecommendation } from '@/services/fit';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { FitFeedback, SellerStore } from '@/types';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    catalog,
    recommendations,
    selectedProduct,
    currentUser,
    orders,
    buyerCreditCenter,
    profile,
    currentCatalogSearchContext,
    currentChatSearchContext,
    selectProduct,
    addToCart,
    isFavorite,
    toggleFavorite,
    createOutfit,
    submitProductReviewWithReward,
    submitFitFeedbackWithReward,
    getProductReviews,
    getProductFitFeedback,
    loadProductEngagement,
    loadSellerStoreById,
    logEvent,
    recordSearchAnalytics,
  } = useAppState();
  const product = catalog.find((item) => item.id === id) ?? selectedProduct;
  const recommendation = recommendations.find((item) => item.product.id === product.id);
  const reviews = getProductReviews(product.id);
  const feedback = getProductFitFeedback(product.id);
  const purchasedItems = orders.flatMap((order) => order.items.filter((item) => item.productId === product.id));
  const purchasedSizes = Array.from(new Set(purchasedItems.map((item) => item.size)));
  const canReviewProduct = purchasedItems.length > 0;
  const userReview = reviews.find((review) => review.userId === (currentUser?.id ?? 'demo-local-user'));
  const userFitFeedback = feedback.find((item) => item.userId === (currentUser?.id ?? 'demo-local-user'));
  const reviewRewardTask = buyerCreditCenter?.tasks.find((task) => task.type === 'review' && task.productId === product.id);
  const fitFeedbackRewardTask = buyerCreditCenter?.tasks.find((task) => task.type === 'fit_feedback' && task.productId === product.id);
  const fitRecommendation = getFitRecommendation(product, profile, profile.size, feedback);
  const activeSearchContext =
    (currentChatSearchContext?.resultIds.includes(product.id) ? currentChatSearchContext : undefined) ??
    (currentCatalogSearchContext?.resultIds.includes(product.id) ? currentCatalogSearchContext : undefined);
  const [sizeBought, setSizeBought] = useState(product.sizes.includes(profile.size) ? profile.size : product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [fitResult, setFitResult] = useState<FitFeedback['result']>('true');
  const [sellerStore, setSellerStore] = useState<SellerStore | undefined>();
  const storeName = sellerStore?.name ?? product.seller;
  const storeRating = sellerStore?.rating ?? Math.min(5, Math.max(4.2, product.sellerReliability / 20));
  const storeBadges =
    sellerStore?.trustBadges?.length
      ? sellerStore.trustBadges
      : sellerStore?.badges?.length
        ? sellerStore.badges
        : ['Güvenilir satıcı', 'AI-ready ürün'];
  const shippingTime = sellerStore?.shippingTime ?? '2-4 iş günü';
  const returnPolicy = sellerStore?.returnPolicy ?? '14 gün içinde iade kabul edilir.';
  const storeContact =
    sellerStore?.supportEmail || sellerStore?.supportPhone
      ? `${sellerStore.supportEmail ?? ''} ${sellerStore.supportPhone ? `· ${sellerStore.supportPhone}` : ''}`.trim()
      : sellerStore?.contact ?? 'Satıcıya uygulama içinden ulaşılabilir.';

  useEffect(() => {
    void loadProductEngagement(product.id);
  }, [product.id]);

  useEffect(() => {
    let mounted = true;

    if (!product.sellerId) {
      setSellerStore(undefined);
      return () => {
        mounted = false;
      };
    }

    void loadSellerStoreById(product.sellerId).then((store) => {
      if (!mounted) return;
      setSellerStore(store);
      logEvent('seller_store_viewed', { productId: product.id, sellerId: product.sellerId ?? '' });
    });

    return () => {
      mounted = false;
    };
  }, [product.id, product.sellerId]);

  function addProductToCart() {
    selectProduct(product.id);
    const metadata = activeSearchContext
      ? buildSearchMetadata(activeSearchContext, product.id, { source: activeSearchContext.surface })
      : undefined;
    for (let index = 0; index < quantity; index += 1) addToCart(product.id, sizeBought, metadata);
    router.push('/checkout');
  }

  function submitFeedback() {
    if (!canReviewProduct || userReview) return;
    const purchasedSize = purchasedSizes.includes(sizeBought) ? sizeBought : purchasedSizes[0] ?? sizeBought;
    void submitProductReviewWithReward({
      productId: product.id,
      rating: reviewRating,
      text: reviewText.trim() || 'Ürün beklentimi karşıladı.',
      sizeBought: purchasedSize,
      fitResult: 'true',
    });
    setReviewText('');
  }

  function submitFitFeedback() {
    if (!canReviewProduct || userFitFeedback) return;
    const purchasedSize = purchasedSizes.includes(sizeBought) ? sizeBought : purchasedSizes[0] ?? sizeBought;
    void submitFitFeedbackWithReward({
      productId: product.id,
      usualSize: profile.size,
      boughtSize: purchasedSize,
      result: fitResult,
    });
  }

  return (
    <Screen>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topControls}>
            <Pressable style={styles.roundButton} onPress={() => router.back()}>
              <ArrowLeft size={18} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.roundButton} onPress={() => toggleFavorite(product.id)}>
              <Heart
                size={18}
                color={isFavorite(product.id) ? colors.coral : colors.ink}
                fill={isFavorite(product.id) ? colors.coral : 'transparent'}
              />
            </Pressable>
          </View>

          <View style={styles.imageGrid}>
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          </View>

          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>

          <OptionRow label="Size" value={sizeBought} values={product.sizes} onSelect={setSizeBought} />
          <OptionRow label="Color" value={product.color} values={[product.color]} />

          <View style={styles.quantityRow}>
            <Text style={styles.optionLabel}>Quantity</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperButton} onPress={() => setQuantity((current) => Math.max(1, current - 1))}>
                <Minus size={14} color={colors.surface} />
              </Pressable>
              <Text style={styles.quantity}>{quantity}</Text>
              <Pressable style={styles.stepperButton} onPress={() => setQuantity((current) => current + 1)}>
                <Plus size={14} color={colors.surface} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.description}>
            {recommendation?.reason ?? product.description}
          </Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>AI Fit</Text>
            <Text style={styles.infoBody}>
              {fitRecommendation.recommendedSize} beden uygun görünüyor. {fitRecommendation.reason}
            </Text>
          </View>

          <Pressable
            style={styles.storeCard}
            onPress={() => {
              if (product.sellerId) router.push({ pathname: '/store/[id]', params: { id: product.sellerId } });
            }}
          >
            <View style={styles.storeHeader}>
              {sellerStore?.logoUrl ? (
                <Image source={{ uri: sellerStore.logoUrl }} style={styles.storeLogoImage} resizeMode="cover" />
              ) : (
                <BrandLogo size={38} framed backgroundColor={colors.trustSoft} style={styles.storeIcon} />
              )}
              <View style={styles.flex}>
                <Text style={styles.infoTitle}>{storeName}</Text>
                <View style={styles.ratingRow}>
                  <Star size={14} color={colors.yellow} fill={colors.yellow} />
                  <Text style={styles.storeMeta}>{storeRating.toFixed(1)} mağaza puanı</Text>
                </View>
              </View>
            </View>
            <View style={styles.storeFacts}>
              <View style={styles.storeFact}>
                <Truck size={15} color={colors.green} />
                <Text style={styles.storeMeta}>{shippingTime}</Text>
              </View>
              <View style={styles.storeFact}>
                <ShieldCheck size={15} color={colors.blue} />
                <Text style={styles.storeMeta}>{returnPolicy}</Text>
              </View>
            </View>
            <View style={styles.storeBadges}>
              {storeBadges.slice(0, 3).map((badge) => (
                <View key={badge} style={styles.storeBadge}>
                  <Text style={styles.storeBadgeText}>{badge}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.infoBody}>{storeContact}</Text>
          </Pressable>

          <View style={styles.reviewHeader}>
            <Text style={styles.infoTitle}>Yorumlar</Text>
            <View style={styles.ratingRow}>
              <Star size={15} color={colors.yellow} fill={colors.yellow} />
              <Text style={styles.ratingText}>{getAverageRating(reviews)}</Text>
            </View>
          </View>

          {canReviewProduct && !userReview ? (
            <View style={styles.reviewComposer}>
              <View style={styles.reviewComposerHeader}>
              <Text style={styles.reviewComposerTitle}>Satın aldığın ürünü değerlendir</Text>
                <RatingSelector value={reviewRating} onChange={setReviewRating} />
              </View>
              <Text style={styles.reviewComposerMeta}>
                {reviewRewardTask
                  ? `Yorum yap, +${reviewRewardTask.rewardCredits} jeton kazan`
                  : `Satın alınan beden: ${purchasedSizes.join(', ') || sizeBought}`}
              </Text>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Kısa yorum yaz"
                placeholderTextColor={colors.muted}
                style={styles.reviewInput}
              />
              <Pressable style={styles.feedbackButton} onPress={submitFeedback}>
                <Text style={styles.feedbackText}>Yorum gönder</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.reviewLockedCard}>
              <View style={styles.reviewLockedIcon}>
                <ShoppingBag size={16} color={colors.inkStrong} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.reviewLockedTitle}>
                  {userReview ? 'Bu ürünü değerlendirdin' : 'Yorum için satın alma gerekli'}
                </Text>
                <Text style={styles.reviewLockedText}>
                  {userReview
                    ? 'Değerlendirmen ürün sayfasında diğer alıcılara yardımcı olur.'
                    : 'Ürünü satın aldıktan sonra yorum ve puan verebilirsin.'}
                </Text>
              </View>
            </View>
          )}

          {canReviewProduct && !userFitFeedback ? (
            <View style={styles.fitComposer}>
              <View style={styles.reviewComposerHeader}>
                <Text style={styles.reviewComposerTitle}>Beden duruşunu paylaş</Text>
                <Text style={styles.reviewComposerMeta}>
                  {fitFeedbackRewardTask ? `+${fitFeedbackRewardTask.rewardCredits} jeton` : 'Fit bilgisi'}
                </Text>
              </View>
              <View style={styles.fitOptions}>
                {[
                  { id: 'tight', label: 'Dar geldi' },
                  { id: 'true', label: 'Tam oldu' },
                  { id: 'loose', label: 'Bol geldi' },
                ].map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.fitOption, fitResult === option.id && styles.fitOptionActive]}
                    onPress={() => setFitResult(option.id as FitFeedback['result'])}
                  >
                    <Text style={[styles.fitOptionText, fitResult === option.id && styles.fitOptionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.feedbackButton} onPress={submitFitFeedback}>
                <Text style={styles.feedbackText}>Fit bilgisini gönder</Text>
              </Pressable>
            </View>
          ) : null}

          {reviews.slice(0, 2).map((review) => (
            <View key={review.id} style={styles.reviewRow}>
              <View style={styles.reviewRowHeader}>
                <Text style={styles.reviewName}>{review.userId === currentUser?.id ? 'Sen' : 'Alıcı'}</Text>
                <View style={styles.ratingRow}>
                  <Star size={12} color={colors.yellow} fill={colors.yellow} />
                  <Text style={styles.reviewRating}>{review.rating}</Text>
                </View>
              </View>
              <Text style={styles.infoBody}>{review.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceText}>{formatPrice(product.price * quantity)}</Text>
          </View>
          <Pressable style={styles.addButton} onPress={addProductToCart}>
            <ShoppingBag size={16} color={colors.surface} />
            <Text style={styles.addButtonText}>Add to Bag</Text>
          </Pressable>
          <Pressable
            style={styles.tryButton}
            onPress={() => {
              createOutfit(product.id);
              if (activeSearchContext?.searchId) {
                logEvent('try_on_opened', buildSearchMetadata(activeSearchContext, product.id, { source: activeSearchContext.surface }));
                recordSearchAnalytics('search_result_try_on_opened', {
                  source: activeSearchContext.surface,
                  query: activeSearchContext.query,
                  searchId: activeSearchContext.searchId,
                  mode: activeSearchContext.mode,
                  productId: product.id,
                  resultIds: activeSearchContext.resultIds,
                });
              }
              router.push('/try-on');
            }}
          >
            <WandSparkles size={16} color={colors.ai} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function buildSearchMetadata(
  context: { searchId: string; query: string; mode?: string; source: 'internal' | 'local'; surface: 'catalog' | 'chat' },
  productId: string,
  extra?: Record<string, string | number | boolean>,
) {
  return {
    productId,
    searchId: context.searchId,
    query: context.query,
    mode: context.mode ?? 'default',
    searchSource: context.source,
    ...extra,
  };
}

function OptionRow({
  label,
  value,
  values,
  onSelect,
}: {
  label: string;
  value: string;
  values: string[];
  onSelect?: (value: string) => void;
}) {
  return (
    <View style={styles.optionCard}>
      <Text style={styles.optionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionValues}>
        {values.map((item) => (
          <Pressable
            key={item}
            style={[styles.optionValue, item === value && styles.optionValueActive]}
            onPress={() => onSelect?.(item)}
          >
            <Text style={[styles.optionValueText, item === value && styles.optionValueTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ChevronDown size={16} color={colors.ink} />
    </View>
  );
}

function RatingSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.starSelector}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable key={rating} onPress={() => onChange(rating)} hitSlop={8}>
          <Star
            size={19}
            color={rating <= value ? colors.yellow : colors.muted}
            fill={rating <= value ? colors.yellow : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
}

function getAverageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return '- puan';
  const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  return `${average.toFixed(1)} puan`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 116,
    gap: 13,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  heroImage: {
    flex: 1,
    height: 265,
    borderRadius: 2,
    backgroundColor: colors.tile,
  },
  productTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  price: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '800',
  },
  optionCard: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  optionValues: {
    gap: 6,
    alignItems: 'center',
  },
  optionValue: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionValueActive: {
    backgroundColor: colors.commerce,
  },
  optionValueText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  optionValueTextActive: {
    color: colors.surface,
  },
  quantityRow: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 16,
    textAlign: 'center',
    color: colors.ink,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  infoBlock: {
    gap: 5,
  },
  storeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 13,
    gap: 10,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  storeLogoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  storeFacts: {
    gap: 7,
  },
  storeFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  storeMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  storeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  storeBadge: {
    borderRadius: 13,
    backgroundColor: colors.tile,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  storeBadgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  infoBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewComposer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  fitComposer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  reviewComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewComposerTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewComposerMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  starSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewInput: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  fitOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fitOption: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.tile,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fitOptionActive: {
    backgroundColor: colors.aiSoft,
    borderColor: colors.ai,
  },
  fitOptionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  fitOptionTextActive: {
    color: colors.ai,
  },
  feedbackButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  feedbackText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewLockedCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  reviewLockedIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tryOnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewLockedTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewLockedText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  reviewRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 4,
  },
  reviewRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewRating: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.commerce,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  footerPrice: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPriceText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  addButton: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  tryButton: {
    width: 54,
    height: '100%',
    backgroundColor: colors.tryOnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function getFitSummary(feedback: FitFeedback[]) {
  if (feedback.length === 0) return 'Henüz fit feedback yok.';
  const counts = feedback.reduce(
    (result, item) => ({
      ...result,
      [item.result]: result[item.result] + 1,
    }),
    { tight: 0, true: 0, loose: 0 },
  );
  if (counts.tight >= counts.true && counts.tight >= counts.loose) return 'Çoğunluk dar geldi diyor.';
  if (counts.loose >= counts.true && counts.loose >= counts.tight) return 'Çoğunluk bol geldi diyor.';
  return 'Çoğunluk tam oldu diyor.';
}
