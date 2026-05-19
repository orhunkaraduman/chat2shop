import { router } from 'expo-router';
import { Clock3, Heart, MessageCircle, Plus, Send, Shirt, ShoppingBag, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ComparisonCard } from '@/components/ComparisonCard';
import { FadeInImage } from '@/components/FadeInImage';
import { Screen } from '@/components/Screen';
import { getBehaviorBoostForProduct } from '@/services/analytics';
import { getFitRecommendation } from '@/services/fit';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice, getCategoryAccent } from '@/theme';
import {
  ChatFollowUpMode,
  ChatConversation,
  ChatMessage,
  Product,
  RecommendationResult,
  SearchContext,
} from '@/types';

const starterPrompts = [
  {
    label: 'Mezuniyet',
    prompt: 'Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın.',
  },
  {
    label: 'Ofis',
    prompt: 'Ofis için smart casual, rahat ama profesyonel bir kombin öner.',
  },
  {
    label: 'Date',
    prompt: 'Romantik bir date için zarif ama abartısız bir elbise öner.',
  },
  {
    label: 'Tatil',
    prompt: 'Yaz tatili için rahat, hafif ve şık parçalar bul.',
  },
  {
    label: 'Sneaker kombini',
    prompt: 'Beyaz sneaker ile uyumlu günlük bir kombin oluştur.',
  },
];

const followUpActions: Array<{ label: string; kind: 'why' | 'cheaper' | 'outfit' | ChatFollowUpMode }> = [
  { label: 'Neden önerdin?', kind: 'why' },
  { label: 'Daha uygun fiyatlı', kind: 'cheaper' },
  { label: 'Kombinle', kind: 'outfit' },
  { label: 'Aynı mağaza', kind: 'same_seller' },
  { label: 'Daha sade', kind: 'simpler' },
  { label: 'Benzer ürünler', kind: 'similar_products' },
];

export default function ChatScreen() {
  const {
    catalog,
    chatMessages,
    chatConversations,
    recommendations,
    comparisonRows,
    selectedOutfit,
    selectedProduct,
    currentChatSearchContext,
    analyticsEvents,
    profile,
    userSettings,
    submitChatPrompt,
    startNewChat,
    openChatConversation,
    selectProduct,
    addToCart,
    addOutfitToCart,
    askWhy,
    requestCheaper,
    requestChatFollowUp,
    requestSameSeller,
    requestSimilarProducts,
    createOutfit,
    isFavorite,
    toggleFavorite,
    logEvent,
    recordSearchAnalytics,
  } = useAppState();
  const [input, setInput] = useState('');
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [isAssistantThinking, setAssistantThinking] = useState(false);

  const visibleRecommendations = useMemo(
    () =>
      recommendations.slice(0, 4).map((recommendation) => {
        const behavior = userSettings.privacy.personalizationEnabled
          ? getBehaviorBoostForProduct(
              analyticsEvents,
              recommendation.product.id,
              currentChatSearchContext?.query,
            )
          : { boost: 0, reasons: [] };

        return {
          ...recommendation,
          matchScore: Math.min(99, recommendation.matchScore + behavior.boost),
          highlights: Array.from(new Set([...recommendation.highlights, ...behavior.reasons])).slice(0, 5),
        };
      }),
    [
      analyticsEvents,
      currentChatSearchContext?.query,
      recommendations,
      userSettings.privacy.personalizationEnabled,
    ],
  );

  function submit(prompt = input) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setAssistantThinking(true);
    submitChatPrompt(trimmed);
    setInput('');
  }

  useEffect(() => {
    if (!isAssistantThinking) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.role === 'assistant') {
      setAssistantThinking(false);
    }
  }, [chatMessages, isAssistantThinking]);

  function openDetails(product: Product) {
    selectProduct(product.id);
    logEvent('product_detail_opened', buildSearchMetadata(currentChatSearchContext, product.id, { source: 'chat' }));
    if (currentChatSearchContext?.searchId) {
      recordSearchAnalytics('search_result_product_opened', {
        source: 'chat',
        query: currentChatSearchContext.query,
        searchId: currentChatSearchContext.searchId,
        mode: currentChatSearchContext.mode,
        productId: product.id,
        resultIds: currentChatSearchContext.resultIds,
      });
    }
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }

  function addProduct(product: Product) {
    selectProduct(product.id);
    addToCart(product.id, undefined, buildSearchMetadata(currentChatSearchContext, product.id, { source: 'chat' }));
  }

  function openTryOn(product: Product) {
    selectProduct(product.id);
    logEvent('try_on_opened', buildSearchMetadata(currentChatSearchContext, product.id, { source: 'chat' }));
    if (currentChatSearchContext?.searchId) {
      recordSearchAnalytics('search_result_try_on_opened', {
        source: 'chat',
        query: currentChatSearchContext.query,
        searchId: currentChatSearchContext.searchId,
        mode: currentChatSearchContext.mode,
        productId: product.id,
        resultIds: currentChatSearchContext.resultIds,
      });
    }
    router.push('/try-on');
  }

  function handleFollowUp(kind: (typeof followUpActions)[number]['kind']) {
    const productId = selectedProduct.id;

    if (kind === 'why') {
      askWhy(productId);
      return;
    }

    if (kind === 'cheaper') {
      requestCheaper(productId);
      return;
    }

    if (kind === 'outfit') {
      createOutfit(productId);
      return;
    }

    if (kind === 'same_seller') {
      requestSameSeller(productId);
      return;
    }

    if (kind === 'similar_products') {
      requestSimilarProducts(productId);
      return;
    }

    requestChatFollowUp(productId, kind);
  }

  function renderMessage(message: ChatMessage) {
    const isUser = message.role === 'user';
    const hasRecommendations = message.type === 'recommendations' && visibleRecommendations.length > 0;

    return (
      <View key={message.id} style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {!isUser ? <Text style={styles.assistantLabelText}>C2S Asistan</Text> : null}
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>
        </View>

        {hasRecommendations ? (
          <View style={styles.recommendationModule}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationRail}
            >
              {visibleRecommendations.map((enrichedRecommendation) => (
                <ChatProductCard
                  key={enrichedRecommendation.product.id}
                  recommendation={enrichedRecommendation}
                  selected={enrichedRecommendation.product.id === selectedProduct.id}
                  favorite={isFavorite(enrichedRecommendation.product.id)}
                  fitSize={getFitRecommendation(enrichedRecommendation.product, profile).recommendedSize}
                  onPress={() => openDetails(enrichedRecommendation.product)}
                  onFavorite={() => {
                    toggleFavorite(
                      enrichedRecommendation.product.id,
                      buildSearchMetadata(currentChatSearchContext, enrichedRecommendation.product.id, { source: 'chat' }),
                    );
                  }}
                  onTryOn={() => openTryOn(enrichedRecommendation.product)}
                  onAdd={() => addProduct(enrichedRecommendation.product)}
                />
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followUpRail}>
              {followUpActions.map((action) => (
                <Pressable
                  key={action.label}
                  style={styles.followUpChip}
                  onPress={() => handleFollowUp(action.kind)}
                >
                  <Text style={styles.followUpChipText}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {message.type === 'comparison' ? (
          <View style={styles.messageAttachment}>
            <ComparisonCard rows={comparisonRows} />
          </View>
        ) : null}

        {message.type === 'outfit' ? (
          <OutfitCard
            productIds={selectedOutfit.productIds}
            catalog={catalog}
            totalPrice={selectedOutfit.totalPrice}
            title={selectedOutfit.title}
            onAdd={() => {
              addOutfitToCart(selectedOutfit);
              router.push('/checkout');
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Screen includeBottomInset={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>C2S Asistan</Text>
            <Text style={styles.headerSubtitle}>Stiline göre ürün bulur</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.historyButton} onPress={() => setHistoryOpen(true)}>
              <Clock3 size={15} color={colors.inkStrong} />
              <Text style={styles.historyButtonText}>Geçmiş</Text>
            </Pressable>
            <Pressable
              style={styles.newChatButton}
              onPress={() => {
                setAssistantThinking(false);
                startNewChat();
              }}
            >
              <Plus size={18} color={colors.surface} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {chatMessages.length === 0 ? (
            <View style={styles.starterPanel}>
            <Text style={styles.starterTitle}>Bugün ne için giyinmek istiyorsun?</Text>
            <Text style={styles.starterSubtitle}>Bir niyet seç veya doğrudan yaz. Ürünleri buna göre sıralayalım.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starterRail}>
              {starterPrompts.map((item) => (
                <Pressable key={item.label} style={styles.starterChip} onPress={() => submit(item.prompt)}>
                  <Text style={styles.starterChipText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            </View>
          ) : null}

          {chatMessages.map(renderMessage)}
          {isAssistantThinking ? <TypingIndicator /> : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Kombin, ürün, beden veya bütçe sor..."
              placeholderTextColor={colors.mutedSoft}
              style={styles.input}
              multiline
              onSubmitEditing={() => submit()}
            />
            <AnimatedPressable style={styles.sendButton} scaleTo={0.9} onPress={() => submit()}>
              <Send size={17} color={colors.surface} />
            </AnimatedPressable>
          </View>
        </View>
        <ChatHistoryModal
          visible={isHistoryOpen}
          conversations={chatConversations}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => {
            setAssistantThinking(false);
            startNewChat();
            setHistoryOpen(false);
          }}
          onOpen={(conversationId) => {
            openChatConversation(conversationId);
            setHistoryOpen(false);
          }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ChatHistoryModal({
  visible,
  conversations,
  onClose,
  onNewChat,
  onOpen,
}: {
  visible: boolean;
  conversations: ChatConversation[];
  onClose: () => void;
  onNewChat: () => void;
  onOpen: (conversationId: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.historyModal}>
        <View style={styles.historyModalHeader}>
          <View>
            <Text style={styles.historyModalTitle}>Geçmiş sohbetler</Text>
            <Text style={styles.historyModalSubtitle}>Son 15 gün içindeki konuşmalar</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={18} color={colors.inkStrong} />
          </Pressable>
        </View>

        <Pressable style={styles.newChatRow} onPress={onNewChat}>
          <View style={styles.newChatIcon}>
            <Plus size={18} color={colors.ai} />
          </View>
          <View style={styles.historyRowCopy}>
            <Text style={styles.historyRowTitle}>Yeni sohbet başlat</Text>
            <Text style={styles.historyRowText}>Temiz bir alışveriş konuşması aç</Text>
          </View>
        </Pressable>

        <ScrollView contentContainerStyle={styles.historyList} showsVerticalScrollIndicator={false}>
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <Pressable key={conversation.id} style={styles.historyRow} onPress={() => onOpen(conversation.id)}>
                <View style={styles.historyIcon}>
                  <MessageCircle size={18} color={colors.ai} />
                </View>
                <View style={styles.historyRowCopy}>
                  <Text style={styles.historyRowTitle} numberOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text style={styles.historyRowText} numberOfLines={1}>
                    {getConversationPreview(conversation.messages)}
                  </Text>
                </View>
                <Text style={styles.historyDate}>{formatConversationDate(conversation.updatedAt)}</Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryTitle}>Henüz geçmiş sohbet yok</Text>
              <Text style={styles.emptyHistoryText}>Yeni bir soru sorduğunda konuşmalar burada tutulur.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getConversationPreview(messages: ChatMessage[]) {
  const lastMessage = [...messages].reverse().find((message) => message.text.trim());
  return lastMessage?.text ?? 'Yeni sohbet';
}

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bugün';

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  });
}

function TypingIndicator() {
  const dotOne = useRef(new Animated.Value(0.35)).current;
  const dotTwo = useRef(new Animated.Value(0.35)).current;
  const dotThree = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const dots = [dotOne, dotTwo, dotThree];
    const animation = Animated.loop(
      Animated.stagger(
        140,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.35,
              duration: 260,
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [dotOne, dotTwo, dotThree]);

  return (
    <View style={styles.typingBubble}>
      <Text style={styles.assistantLabelText}>C2S Asistan</Text>
      <View style={styles.typingDots}>
        {[dotOne, dotTwo, dotThree].map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                opacity: dot,
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [2, -2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ChatProductCard({
  recommendation,
  selected,
  favorite,
  fitSize,
  onPress,
  onFavorite,
  onTryOn,
  onAdd,
}: {
  recommendation: RecommendationResult;
  selected: boolean;
  favorite: boolean;
  fitSize: string;
  onPress: () => void;
  onFavorite: () => void;
  onTryOn: () => void;
  onAdd: () => void;
}) {
  const { product } = recommendation;
  const accent = getCategoryAccent(product.category);

  return (
    <AnimatedPressable style={[styles.chatProduct, selected && { borderColor: accent.accent }]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <FadeInImage source={{ uri: product.imageUrl }} style={styles.chatProductImage} resizeMode="cover" />
        <AnimatedPressable style={styles.favoriteButton} scaleTo={0.9} onPress={onFavorite}>
          <Heart size={15} color={favorite ? colors.favorite : colors.inkSoft} fill={favorite ? colors.favorite : 'transparent'} />
        </AnimatedPressable>
      </View>
      <View style={styles.chatProductBody}>
        <View style={[styles.productAccent, { backgroundColor: accent.accent }]} />
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <View style={styles.productMetaRow}>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          <Text style={styles.matchPill}>%{recommendation.matchScore} uyum</Text>
        </View>
        <View style={styles.fitLine}>
          <SlidersHorizontal size={13} color={colors.ai} />
          <Text style={styles.fitLineText}>Beden uygunluğu: {fitSize}</Text>
        </View>
        <View style={styles.productActions}>
          <ProductAction label="İncele" onPress={onPress} />
          <ProductAction label="Kabin" icon={<Shirt size={13} color={colors.tryOn} />} onPress={onTryOn} />
        </View>
        <AnimatedPressable style={styles.addToCartAction} scaleTo={0.96} onPress={onAdd}>
          <ShoppingBag size={14} color={colors.surface} />
          <Text style={styles.addToCartActionText}>Sepete ekle</Text>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

function ProductAction({ label, icon, onPress }: { label: string; icon?: React.ReactNode; onPress: () => void }) {
  return (
    <AnimatedPressable style={styles.productAction} scaleTo={0.95} onPress={onPress}>
      {icon}
      <Text style={styles.productActionText}>{label}</Text>
    </AnimatedPressable>
  );
}

function OutfitCard({
  productIds,
  catalog,
  title,
  totalPrice,
  onAdd,
}: {
  productIds: string[];
  catalog: Product[];
  title: string;
  totalPrice: number;
  onAdd: () => void;
}) {
  const products = Array.from(new Set(productIds))
    .map((id) => catalog.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  if (products.length === 0) return null;

  return (
    <View style={styles.outfitCard}>
      <View style={styles.outfitHeader}>
        <View>
          <Text style={styles.outfitEyebrow}>Kombin önerisi</Text>
          <Text style={styles.outfitTitle}>{title}</Text>
        </View>
        <Text style={styles.outfitPrice}>{formatPrice(totalPrice)}</Text>
      </View>
      <View style={styles.outfitImages}>
        {products.slice(0, 4).map((product, index) => (
          <FadeInImage
            key={`${product.id}-${index}`}
            source={{ uri: product.imageUrl }}
            style={styles.outfitImage}
            resizeMode="cover"
          />
        ))}
      </View>
      <Text style={styles.outfitMeta}>{products.length} parça birlikte önerildi.</Text>
      <Pressable style={styles.outfitButton} onPress={onAdd}>
        <Text style={styles.outfitButtonText}>Kombini sepete ekle</Text>
      </Pressable>
    </View>
  );
}

function buildSearchMetadata(
  context: SearchContext | undefined,
  productId: string,
  extra?: Record<string, string | number | boolean>,
) {
  return {
    productId,
    searchId: context?.searchId ?? 'none',
    query: context?.query ?? 'none',
    mode: context?.mode ?? 'default',
    searchSource: context?.source ?? 'local',
    ...extra,
  };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyButton: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyButtonText: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  newChatButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.aiSoft,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ai,
  },
  statusText: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 14,
  },
  starterPanel: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  starterTitle: {
    color: colors.inkStrong,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  starterSubtitle: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  starterRail: {
    gap: 9,
    paddingRight: 4,
  },
  starterChip: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterChipText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  historyModal: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingTop: 18,
    paddingHorizontal: 18,
  },
  historyModalHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  historyModalTitle: {
    color: colors.inkStrong,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  historyModalSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatRow: {
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: colors.aiSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  newChatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyList: {
    gap: 10,
    paddingBottom: 28,
  },
  historyRow: {
    minHeight: 76,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRowCopy: {
    flex: 1,
    gap: 3,
  },
  historyRowTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  historyRowText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  historyDate: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyHistory: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 16,
    gap: 4,
    backgroundColor: colors.surface,
  },
  emptyHistoryTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyHistoryText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  messageBlock: {
    gap: 10,
    alignItems: 'flex-start',
  },
  messageBlockUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 5,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 8,
  },
  userBubble: {
    backgroundColor: colors.brand,
    borderTopRightRadius: 8,
  },
  assistantLabelText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  typingBubble: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderTopLeftRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 14,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ai,
  },
  messageText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  userMessageText: {
    color: colors.surface,
  },
  recommendationModule: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    gap: 10,
  },
  recommendationRail: {
    gap: 10,
    paddingHorizontal: 12,
    paddingRight: 18,
  },
  followUpRail: {
    gap: 8,
    paddingHorizontal: 12,
    paddingRight: 18,
  },
  followUpChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpChipText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  messageAttachment: {
    width: '100%',
  },
  chatProduct: {
    width: 228,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  chatProductSelected: {},
  imageWrap: {
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  chatProductImage: {
    width: '100%',
    height: 212,
    backgroundColor: colors.surfaceSubtle,
  },
  favoriteButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatProductBody: {
    padding: 11,
    gap: 8,
  },
  productAccent: {
    width: 34,
    height: 3,
    borderRadius: 2,
  },
  productTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  productPrice: {
    flexShrink: 1,
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  matchPill: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: colors.ai,
    fontSize: 10,
    fontWeight: '900',
  },
  fitLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fitLineText: {
    flex: 1,
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  productAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 6,
  },
  productActionText: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  addToCartAction: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  addToCartActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  outfitCard: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  outfitEyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  outfitTitle: {
    color: colors.inkStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  outfitPrice: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  outfitImages: {
    flexDirection: 'row',
    gap: 8,
  },
  outfitImage: {
    flex: 1,
    height: 76,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
  },
  outfitMeta: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  outfitButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  inputBox: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSubtle,
    paddingLeft: 15,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 10,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
