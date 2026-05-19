import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { defaultProfile, defaultSellerDraft, products, starterOutfit } from '@/data/mockData';
import {
  AIGenerationStatus,
  AddressBookEntry,
  AppUser,
  AnalyticsEvent,
  AnalyticsEventName,
  BuyerCreditAccount,
  BuyerCreditCenter,
  CartItem,
  ChatConversation,
  ChatFollowUpMode,
  ChatMessage,
  CheckoutDetails,
  ComparisonRow,
  DeliveryOption,
  FitFeedback,
  GeneratedListing,
  OrderStatusSummary,
  Order,
  Outfit,
  Product,
  ProductImageEnhancementMode,
  ProductImageEnhancementResult,
  ProductReview,
  RecentSearchEntry,
  RepositoryMode,
  RecommendationResult,
  ReturnRequest,
  ReturnRequestStatus,
  SavedPaymentMethod,
  SearchAnalyticsRecord,
  SearchContext,
  SellerOrder,
  SellerOrderItem,
  SellerOrderTimelineItem,
  SellerOrderStatus,
  SellerCreditAccount,
  SellerCreditPackageId,
  SellerDraft,
  SellerDraftRecord,
  SellerProductStatus,
  SellerRewardCampaign,
  SellerStore,
  SizeChart,
  StyleProfile,
  SuggestedChatAction,
  SyncStatus,
  TryOnPreview,
  TryOnState,
  UserNotificationSettings,
  UserIntent,
  UserPrivacySettings,
  UserRole,
  UserSettings,
} from '@/types';
import {
  buildComparisonRows,
  compareRecommendations,
  createOutfitForProduct,
  findCheaperAlternatives,
  isDailyChatLimitError,
  recommendProducts,
  recommendProductsWithRemote,
  searchCatalogWithRemote,
  SearchIntentFilters,
} from '@/services/ai';
import { createAnalyticsEvent, createSearchAnalyticsRecord } from '@/services/analytics';
import { uploadTryOnInputImage } from '@/services/firebaseUpload';
import {
  generateProductIntelligence,
  isInsufficientAICreditsError,
  normalizeGeneratedListing,
} from '@/services/productIntelligence';
import {
  enhanceProductImage,
  getProductImageEnhanceCost,
} from '@/services/productImageEnhancement';
import { buildTryOnInput, generateTryOn, getTryOnCreditCost } from '@/services/tryOn';
import { getRepositories } from '@/repositories/repositoryFactory';
import {
  loadPersistedState,
  persistAnalyticsEvents,
  persistAddresses,
  persistCartItems,
  persistChatConversations,
  persistCheckoutDetails,
  persistFavoriteProductIds,
  persistFitFeedback,
  persistGeneratedListing,
  persistOrders,
  persistPaymentMethods,
  persistProductReviews,
  persistProfile,
  persistPublishedListings,
  persistRecentSearches,
  persistReturnRequests,
  persistSellerOrders,
  persistSellerDraft,
  persistSellerDraftUpdatedAt,
  persistSellerProducts,
  persistSellerStore,
  persistTryOnHistory,
  persistUserSettings,
} from '@/services/storage';

type AppContextValue = {
  repositoryMode: RepositoryMode;
  currentUser?: AppUser;
  authError?: string;
  authLoading: boolean;
  syncStatus: SyncStatus;
  syncError?: string;
  profile: StyleProfile;
  catalog: Product[];
  recommendations: RecommendationResult[];
  intent?: UserIntent;
  chatMessages: ChatMessage[];
  chatConversations: ChatConversation[];
  activeChatConversationId?: string;
  selectedProduct: Product;
  selectedOutfit: Outfit;
  cartItems: CartItem[];
  favoriteProductIds: string[];
  recentSearches: RecentSearchEntry[];
  currentCatalogSearchContext?: SearchContext;
  currentChatSearchContext?: SearchContext;
  addressBook: AddressBookEntry[];
  paymentMethods: SavedPaymentMethod[];
  deliveryOptions: DeliveryOption[];
  comparisonRows: ComparisonRow[];
  sellerDraft: SellerDraft;
  sellerCreditAccount?: SellerCreditAccount;
  sellerCreditLoading: boolean;
  sellerCreditPurchaseStatus: AIGenerationStatus;
  sellerCreditPurchaseError?: string;
  buyerCreditAccount?: BuyerCreditAccount;
  buyerCreditCenter?: BuyerCreditCenter;
  buyerCreditLoading: boolean;
  tryOnCreditCost: number;
  generatedListing?: GeneratedListing;
  aiGenerationStatus: AIGenerationStatus;
  aiGenerationError?: string;
  lastAIReasoning?: string;
  productImageEnhancementStatus: AIGenerationStatus;
  productImageEnhancementError?: string;
  productImageEnhancementPreview?: ProductImageEnhancementResult & { originalImageUrl: string };
  selectedProductImageEnhancementMode: ProductImageEnhancementMode;
  publishedListings: GeneratedListing[];
  sellerProducts: Product[];
  sellerRewardCampaigns: SellerRewardCampaign[];
  sellerStore: SellerStore;
  sellerStoresById: Record<string, SellerStore>;
  sellerOrders: SellerOrder[];
  buyerSellerOrders: SellerOrder[];
  orders: Order[];
  returnRequests: ReturnRequest[];
  productReviews: ProductReview[];
  fitFeedback: FitFeedback[];
  analyticsEvents: AnalyticsEvent[];
  checkoutDetails: CheckoutDetails;
  userSettings: UserSettings;
  tryOnState: TryOnState;
  tryOnGenerationStatus: AIGenerationStatus;
  tryOnGenerationError?: string;
  tryOnPreview?: TryOnPreview;
  tryOnHistory: TryOnPreview[];
  isPurchaseCompleted: boolean;
  cartTotal: number;
  canManageSeller: boolean;
  signUp: (email: string, password: string, role: UserRole) => Promise<AppUser>;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  updateProfile: (profile: StyleProfile) => void;
  completeOnboardingSetup: (profile: StyleProfile, initialPrompt?: string) => void;
  submitChatPrompt: (prompt: string) => void;
  startNewChat: () => void;
  openChatConversation: (conversationId: string) => void;
  selectProduct: (productId: string) => void;
  addToCart: (productId: string, size?: string, metadata?: AnalyticsEvent['metadata']) => void;
  addOutfitToCart: (outfit: Outfit) => void;
  incrementCartItem: (productId: string, size: string) => void;
  decrementCartItem: (productId: string, size: string) => void;
  removeCartItem: (productId: string, size: string) => void;
  updateCartItemSize: (productId: string, previousSize: string, nextSize: string) => void;
  clearCart: () => void;
  completePurchase: () => Promise<Order | undefined>;
  updateCheckoutDetails: (details: Partial<CheckoutDetails>) => void;
  updateNotificationSettings: (patch: Partial<UserNotificationSettings>) => void;
  updatePrivacySettings: (patch: Partial<UserPrivacySettings>) => void;
  getCheckoutValidationErrors: () => string[];
  saveAddress: (address: Partial<AddressBookEntry> & Pick<AddressBookEntry, 'label' | 'recipient' | 'phone' | 'line1' | 'city' | 'district'>) => void;
  removeAddress: (addressId: string) => void;
  savePaymentMethod: (paymentMethod: Partial<SavedPaymentMethod> & Pick<SavedPaymentMethod, 'label' | 'holderName' | 'brand' | 'last4' | 'expiryMonth' | 'expiryYear' | 'type'>) => void;
  removePaymentMethod: (paymentMethodId: string) => void;
  saveRecentSearch: (query: string, filters?: SearchIntentFilters) => void;
  clearRecentSearches: () => void;
  setCatalogSearchContext: (context?: SearchContext) => void;
  toggleFavorite: (productId: string, metadata?: AnalyticsEvent['metadata']) => void;
  isFavorite: (productId: string) => boolean;
  askWhy: (productId: string) => void;
  requestCheaper: (productId: string) => void;
  requestChatFollowUp: (productId: string, mode: ChatFollowUpMode) => void;
  requestSameSeller: (productId: string) => void;
  requestSimilarBudget: (productId: string) => void;
  requestSimilarProducts: (productId: string) => void;
  createOutfit: (productId: string) => Outfit;
  compareTopProducts: () => void;
  updateTryOnState: (state: Partial<TryOnState>) => void;
  generateTryOnPreview: () => Promise<void>;
  restoreTryOnPreview: (previewId: string) => void;
  recordTryOnToCheckout: () => void;
  refreshBuyerCredits: () => Promise<BuyerCreditAccount | undefined>;
  refreshBuyerCreditCenter: () => Promise<BuyerCreditCenter | undefined>;
  claimBuyerCampaignReward: (sellerId: string, campaignId: string) => Promise<void>;
  getSponsoredTryOnTaskForProduct: (productId: string) => BuyerCreditCenter['tasks'][number] | undefined;
  updateSellerDraft: (draft: Partial<SellerDraft>) => void;
  refreshSellerCredits: () => Promise<SellerCreditAccount | undefined>;
  purchaseSellerCreditPackage: (packageId: SellerCreditPackageId) => Promise<void>;
  setProductImageEnhancementMode: (mode: ProductImageEnhancementMode) => void;
  enhanceSellerProductImage: () => Promise<void>;
  acceptEnhancedProductImage: () => void;
  discardEnhancedProductImage: () => void;
  generateSellerListing: () => Promise<void>;
  regenerateSellerListing: () => Promise<void>;
  updateGeneratedListing: (listing: Partial<GeneratedListing>) => void;
  publishListing: () => Promise<void>;
  updateSellerProduct: (productId: string, patch: Partial<Product>) => Promise<void>;
  updateSellerProductSizeChart: (productId: string, sizeChart: SizeChart) => Promise<void>;
  archiveSellerProduct: (productId: string) => Promise<void>;
  activateSellerProduct: (productId: string) => Promise<void>;
  deleteSellerProduct: (productId: string) => Promise<void>;
  createSellerRewardCampaign: (type: SellerRewardCampaign['type'], overrides?: Partial<SellerRewardCampaign>) => Promise<void>;
  archiveSellerRewardCampaign: (campaignId: string) => Promise<void>;
  updateSellerStore: (store: Partial<SellerStore>) => void;
  loadSellerStoreById: (sellerId: string) => Promise<SellerStore | undefined>;
  updateSellerOrderStatus: (orderId: string, status: SellerOrderStatus) => Promise<void>;
  getSellerOrdersForBuyerOrder: (orderId: string) => SellerOrder[];
  loadBuyerSellerOrders: () => Promise<SellerOrder[]>;
  submitReturnRequest: (request: {
    buyerOrderId: string;
    productId: string;
    size: string;
    quantity: number;
    reason: string;
    note?: string;
    imageUri?: string;
  }) => Promise<void>;
  updateReturnRequestStatus: (requestId: string, status: ReturnRequestStatus, decisionNote?: string) => Promise<void>;
  getReturnRequestsForBuyerOrder: (orderId: string) => ReturnRequest[];
  getReturnRequestsForSellerOrder: (sellerOrderId: string) => ReturnRequest[];
  updateSellerOrderFulfillment: (orderId: string, patch: Pick<SellerOrder, 'carrierLabel' | 'trackingNumber'>) => Promise<void>;
  addProductReview: (review: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) => void;
  submitProductReviewWithReward: (review: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  submitFitFeedbackWithReward: (feedback: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addFitFeedback: (feedback: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) => void;
  getProductReviews: (productId: string) => ProductReview[];
  getProductFitFeedback: (productId: string) => FitFeedback[];
  loadProductEngagement: (productId: string) => Promise<void>;
  isProductEngagementLoading: (productId: string) => boolean;
  logEvent: (name: AnalyticsEventName, metadata?: AnalyticsEvent['metadata']) => void;
  getAuthToken: () => Promise<string | undefined>;
  recordSearchAnalytics: (
    eventType: SearchAnalyticsRecord['eventType'],
    record: Omit<SearchAnalyticsRecord, 'id' | 'eventType' | 'createdAt' | 'sessionId' | 'userId'>,
  ) => void;
};

const defaultPrompt = 'Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın.';
const initialRecommendation = recommendProducts(defaultPrompt, defaultProfile, products);
const defaultAddressBook = createDefaultAddresses();
const defaultPaymentMethods = createDefaultPaymentMethods();
const deliveryOptions = createDeliveryOptions();
const defaultUserSettings: UserSettings = {
  notifications: {
    orderUpdates: true,
    styleSuggestions: true,
    campaigns: false,
  },
  privacy: {
    personalizationEnabled: true,
    usageAnalyticsEnabled: true,
    tryOnHistoryEnabled: true,
  },
  updatedAt: new Date().toISOString(),
};
const defaultCheckoutDetails: CheckoutDetails = {
  addressId: defaultAddressBook[0].id,
  paymentMethodId: defaultPaymentMethods[0].id,
  deliveryOptionId: deliveryOptions[0].id,
  note: '',
};
const defaultAvatar =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80';
const shippingCost = 50;
const chatHistoryRetentionDays = 15;
const defaultSellerStore = createDefaultSellerStore();
const demoBuyerEmail = 'buyer@chat2shop.dev';
const demoBlueSummerOrderId = 'demo-order-blue-summer-midi';
const emptySellerDraftUpdatedAt = new Date(0).toISOString();

const AppContext = createContext<AppContextValue | undefined>(undefined);
const repositories = getRepositories();

function createDefaultSellerDraft(): SellerDraft {
  return { ...defaultSellerDraft };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | undefined>();
  const [authError, setAuthError] = useState<string | undefined>();
  const [authLoading, setAuthLoading] = useState(repositories.mode === 'firebase');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | undefined>();
  const [profile, setProfile] = useState(defaultProfile);
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>(
    initialRecommendation.recommendations,
  );
  const [intent, setIntent] = useState<UserIntent | undefined>(initialRecommendation.intent);
  const [selectedProductId, setSelectedProductId] = useState(
    initialRecommendation.recommendations[0]?.product.id ?? products[0].id,
  );
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit>(starterOutfit);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [currentCatalogSearchContext, setCurrentCatalogSearchContext] = useState<SearchContext | undefined>();
  const [currentChatSearchContext, setCurrentChatSearchContext] = useState<SearchContext | undefined>();
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>(defaultAddressBook);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(defaultPaymentMethods);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [sellerDraft, setSellerDraft] = useState(createDefaultSellerDraft());
  const [sellerDraftUpdatedAt, setSellerDraftUpdatedAt] = useState(emptySellerDraftUpdatedAt);
  const [sellerCreditAccount, setSellerCreditAccount] = useState<SellerCreditAccount | undefined>();
  const [sellerCreditLoading, setSellerCreditLoading] = useState(false);
  const [sellerCreditPurchaseStatus, setSellerCreditPurchaseStatus] = useState<AIGenerationStatus>('idle');
  const [sellerCreditPurchaseError, setSellerCreditPurchaseError] = useState<string | undefined>();
  const [buyerCreditAccount, setBuyerCreditAccount] = useState<BuyerCreditAccount | undefined>();
  const [buyerCreditCenter, setBuyerCreditCenter] = useState<BuyerCreditCenter | undefined>();
  const [buyerCreditLoading, setBuyerCreditLoading] = useState(false);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | undefined>();
  const [aiGenerationStatus, setAIGenerationStatus] = useState<AIGenerationStatus>('ready');
  const [aiGenerationError, setAIGenerationError] = useState<string | undefined>();
  const [lastAIReasoning, setLastAIReasoning] = useState<string | undefined>();
  const [productImageEnhancementStatus, setProductImageEnhancementStatus] = useState<AIGenerationStatus>('idle');
  const [productImageEnhancementError, setProductImageEnhancementError] = useState<string | undefined>();
  const [productImageEnhancementPreview, setProductImageEnhancementPreview] = useState<
    (ProductImageEnhancementResult & { originalImageUrl: string }) | undefined
  >();
  const [selectedProductImageEnhancementMode, setSelectedProductImageEnhancementMode] =
    useState<ProductImageEnhancementMode>('catalog_white');
  const [listingVersion, setListingVersion] = useState(0);
  const [publishedListings, setPublishedListings] = useState<GeneratedListing[]>([]);
  const [sellerRewardCampaigns, setSellerRewardCampaigns] = useState<SellerRewardCampaign[]>([]);
  const [sellerStore, setSellerStore] = useState<SellerStore>(defaultSellerStore);
  const [sellerStoresById, setSellerStoresById] = useState<Record<string, SellerStore>>({
    [defaultSellerStore.sellerId]: defaultSellerStore,
  });
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([]);
  const [buyerSellerOrders, setBuyerSellerOrders] = useState<SellerOrder[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [fitFeedback, setFitFeedback] = useState<FitFeedback[]>([]);
  const [engagementLoadingProductIds, setEngagementLoadingProductIds] = useState<string[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>(defaultCheckoutDetails);
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [tryOnState, setTryOnState] = useState<TryOnState>({
    mode: 'avatar',
    avatarUri: defaultAvatar,
    selectedSize: defaultProfile.size,
    selectedColor: products[0].color,
    environment: 'outdoor',
  });
  const [tryOnGenerationStatus, setTryOnGenerationStatus] = useState<AIGenerationStatus>('idle');
  const [tryOnGenerationError, setTryOnGenerationError] = useState<string | undefined>();
  const [tryOnPreview, setTryOnPreview] = useState<TryOnPreview | undefined>();
  const [tryOnHistory, setTryOnHistory] = useState<TryOnPreview[]>([]);
  const [isPurchaseCompleted, setPurchaseCompleted] = useState(false);
  const [activeChatConversationId, setActiveChatConversationId] = useState(() => createChatConversationId());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    assistantMessage(
      'Mezuniyet için uygun ürünleri stil profiline, bütçene ve beden tercihine göre sıraladım.',
      'recommendations',
    ),
  ]);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const syncedUserIdRef = useRef<string | undefined>(undefined);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const stateRef = useRef({
    profile: defaultProfile,
    catalog: products,
    cartItems: [] as CartItem[],
    favoriteProductIds: [] as string[],
    recentSearches: [] as RecentSearchEntry[],
    addressBook: defaultAddressBook,
    paymentMethods: defaultPaymentMethods,
    orders: [] as Order[],
    returnRequests: [] as ReturnRequest[],
    checkoutDetails: defaultCheckoutDetails,
    sellerDraft: createDefaultSellerDraft(),
    sellerDraftUpdatedAt: emptySellerDraftUpdatedAt,
    generatedListing: undefined as GeneratedListing | undefined,
    sellerProducts: [] as Product[],
    sellerStore: defaultSellerStore,
    sellerOrders: [] as SellerOrder[],
    buyerSellerOrders: [] as SellerOrder[],
    buyerCreditCenter: undefined as BuyerCreditCenter | undefined,
    userSettings: defaultUserSettings,
  });

  useEffect(() => {
    stateRef.current = {
      profile,
      catalog,
      cartItems,
      favoriteProductIds,
      recentSearches,
      addressBook,
      paymentMethods,
      orders,
      returnRequests,
      checkoutDetails,
      sellerDraft,
      sellerDraftUpdatedAt,
      generatedListing,
      sellerProducts,
      sellerStore,
      sellerOrders,
      buyerSellerOrders,
      buyerCreditCenter,
      userSettings,
    };
  }, [
    addressBook,
    buyerSellerOrders,
    buyerCreditCenter,
    cartItems,
    catalog,
    checkoutDetails,
    favoriteProductIds,
    recentSearches,
    generatedListing,
    orders,
    paymentMethods,
    profile,
    returnRequests,
    sellerDraft,
    sellerDraftUpdatedAt,
    sellerProducts,
    sellerStore,
    sellerOrders,
    userSettings,
  ]);

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: () => void = () => undefined;

    async function hydrate() {
      try {
        const persisted = await loadPersistedState();
        if (!mounted) return;

        const nextProfile = persisted.profile ?? defaultProfile;
        const persistedSellerProducts = repositories.mode === 'local' ? persisted.sellerProducts ?? [] : [];
        const repositoryProducts = await repositories.products.listProducts();
        if (!mounted) return;

        const mergedSellerProducts = persistedSellerProducts;
        const nextCatalog = mergeProducts(getBaseCatalogForRepositoryMode(), [...repositoryProducts, ...mergedSellerProducts]);
        const activeCatalog = getActiveCatalog(nextCatalog);
        const nextRecommendation = recommendProducts(defaultPrompt, nextProfile, activeCatalog);
        const persistedDraftRecord = sanitizeSellerDraftRecord({
          draft: persisted.sellerDraft ?? createDefaultSellerDraft(),
          generatedListing: persisted.generatedListing,
          updatedAt: persisted.sellerDraftUpdatedAt ?? emptySellerDraftUpdatedAt,
        });
        const nextSellerDraft = persistedDraftRecord.draft;
        const nextGeneratedListing = persistedDraftRecord.generatedListing
          ? normalizeGeneratedListing(
              persistedDraftRecord.generatedListing,
              nextSellerDraft,
              0,
              persistedDraftRecord.generatedListing.aiSource ?? 'mock',
            )
          : undefined;
        const nextSellerDraftUpdatedAt = persistedDraftRecord.updatedAt;
        const nextSellerStore = persisted.sellerStore ?? defaultSellerStore;
        const nextSellerOrders = persisted.sellerOrders ?? [];
        const nextBuyerSellerOrders = nextSellerOrders.filter((order) => Boolean(order.buyerOrderId));
        const nextAddressBook = persisted.addresses ?? defaultAddressBook;
        const nextPaymentMethods = persisted.paymentMethods ?? defaultPaymentMethods;
        const nextReturnRequests = persisted.returnRequests ?? [];
        const nextRecentSearches = persisted.recentSearches ?? [];
        const nextCheckoutDetails = normalizeCheckoutDetails(persisted.checkoutDetails);
        const nextUserSettings = normalizeUserSettings(persisted.userSettings);
        const fallbackChatMessages = [
          assistantMessage(
            'Mezuniyet için uygun ürünleri stil profiline, bütçene ve beden tercihine göre sıraladım.',
            'recommendations',
          ),
        ];
        const recentChatConversations = normalizeRecentChatConversations(persisted.chatConversations ?? []);
        const fallbackConversationId = persisted.activeChatConversationId ?? createChatConversationId();
        const fallbackConversation = createChatConversationSnapshot({
          id: fallbackConversationId,
          messages: fallbackChatMessages,
          recommendations: nextRecommendation.recommendations,
          comparisonRows: [],
          selectedOutfit: starterOutfit,
          selectedProductId: nextRecommendation.recommendations[0]?.product.id ?? activeCatalog[0]?.id ?? products[0].id,
          currentChatSearchContext: undefined,
        });
        const nextChatConversations = recentChatConversations.length > 0 ? recentChatConversations : [fallbackConversation];
        const nextActiveConversation =
          nextChatConversations.find((conversation) => conversation.id === persisted.activeChatConversationId) ??
          nextChatConversations[0];
        const nextSelectedProductId =
          nextActiveConversation.selectedProductId ??
          nextActiveConversation.recommendations[0]?.product.id ??
          nextRecommendation.recommendations[0]?.product.id ??
          activeCatalog[0]?.id ??
          products[0].id;

        stateRef.current = {
          profile: nextProfile,
          catalog: nextCatalog,
          cartItems: persisted.cartItems ?? [],
          favoriteProductIds: persisted.favoriteProductIds ?? [],
          recentSearches: nextRecentSearches,
          addressBook: nextAddressBook,
          paymentMethods: nextPaymentMethods,
          orders: persisted.orders ?? [],
          returnRequests: nextReturnRequests,
          checkoutDetails: nextCheckoutDetails,
          sellerDraft: nextSellerDraft,
          sellerDraftUpdatedAt: nextSellerDraftUpdatedAt,
          generatedListing: nextGeneratedListing,
          sellerProducts: mergedSellerProducts,
          sellerStore: nextSellerStore,
          sellerOrders: nextSellerOrders,
          buyerSellerOrders: nextBuyerSellerOrders,
          buyerCreditCenter: undefined,
          userSettings: nextUserSettings,
        };
        setProfile(nextProfile);
        setCartItems(persisted.cartItems ?? []);
        setFavoriteProductIds(persisted.favoriteProductIds ?? []);
        setRecentSearches(nextRecentSearches);
        setAddressBook(nextAddressBook);
        setPaymentMethods(nextPaymentMethods);
        setSellerDraft(nextSellerDraft);
        setSellerDraftUpdatedAt(nextSellerDraftUpdatedAt);
        setGeneratedListing(nextGeneratedListing);
        setLastAIReasoning(nextGeneratedListing?.reasoning);
        setPublishedListings(repositories.mode === 'local' ? persisted.publishedListings ?? [] : []);
        setSellerProducts(mergedSellerProducts);
        setSellerStore(nextSellerStore);
        setSellerStoresById((current) => ({
          ...current,
          [nextSellerStore.sellerId]: nextSellerStore,
        }));
        setSellerOrders(nextSellerOrders);
        setBuyerSellerOrders(nextBuyerSellerOrders);
        setCatalog(nextCatalog);
        setOrders(persisted.orders ?? []);
        setReturnRequests(nextReturnRequests);
        setProductReviews(persisted.productReviews ?? []);
        setFitFeedback(persisted.fitFeedback ?? []);
        setAnalyticsEvents(persisted.analyticsEvents ?? []);
        setTryOnHistory(persisted.tryOnHistory ?? []);
        setCheckoutDetails(nextCheckoutDetails);
        setUserSettings(nextUserSettings);
        setRecommendations(nextActiveConversation.recommendations.length > 0 ? nextActiveConversation.recommendations : nextRecommendation.recommendations);
        setIntent(nextRecommendation.intent);
        setSelectedProductId(nextSelectedProductId);
        setComparisonRows(nextActiveConversation.comparisonRows ?? []);
        setSelectedOutfit(nextActiveConversation.selectedOutfit ?? starterOutfit);
        setCurrentChatSearchContext(nextActiveConversation.currentChatSearchContext);
        setChatMessages(nextActiveConversation.messages.length > 0 ? nextActiveConversation.messages : fallbackChatMessages);
        setChatConversations(nextChatConversations);
        setActiveChatConversationId(nextActiveConversation.id);
      } catch {
        if (mounted) setAuthError('Firebase bağlantısı kurulamadı; demo/local modla devam ediliyor.');
      } finally {
        if (mounted) {
          setHydrated(true);
          unsubscribeAuth = repositories.auth.onAuthStateChanged((user) => {
            setAuthLoading(false);
            setCurrentUser(user);
            if (user) {
              void syncRemoteForUser(user);
              return;
            }
            syncedUserIdRef.current = undefined;
            setSellerCreditAccount(undefined);
            setBuyerCreditAccount(undefined);
            setBuyerCreditCenter(undefined);
            setSellerRewardCampaigns([]);
            setSellerCreditPurchaseStatus('idle');
            setSellerCreditPurchaseError(undefined);
            setSyncStatus('idle');
          });
          if (repositories.mode === 'local') {
            setAuthLoading(false);
          }
        }
      }
    }

    void hydrate();

    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (isHydrated) void persistProfile(profile);
  }, [isHydrated, profile]);

  useEffect(() => {
    if (isHydrated) void persistCartItems(cartItems);
  }, [cartItems, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistFavoriteProductIds(favoriteProductIds);
  }, [favoriteProductIds, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistRecentSearches(recentSearches);
  }, [isHydrated, recentSearches]);

  useEffect(() => {
    if (isHydrated) void persistAddresses(addressBook);
  }, [addressBook, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistPaymentMethods(paymentMethods);
  }, [isHydrated, paymentMethods]);

  useEffect(() => {
    if (isHydrated) void persistSellerDraft(sellerDraft);
  }, [isHydrated, sellerDraft]);

  useEffect(() => {
    if (isHydrated) void persistSellerDraftUpdatedAt(sellerDraftUpdatedAt);
  }, [isHydrated, sellerDraftUpdatedAt]);

  useEffect(() => {
    if (isHydrated) void persistGeneratedListing(generatedListing);
  }, [generatedListing, isHydrated]);

  useEffect(() => {
    if (isHydrated && repositories.mode === 'local') void persistPublishedListings(publishedListings);
  }, [isHydrated, publishedListings]);

  useEffect(() => {
    if (isHydrated && repositories.mode === 'local') void persistSellerProducts(sellerProducts);
  }, [isHydrated, sellerProducts]);

  useEffect(() => {
    if (isHydrated && repositories.mode === 'local') void persistOrders(orders);
  }, [isHydrated, orders]);

  useEffect(() => {
    if (isHydrated && repositories.mode === 'local') void persistReturnRequests(returnRequests);
  }, [isHydrated, returnRequests]);

  useEffect(() => {
    if (isHydrated) void persistSellerStore(sellerStore);
  }, [isHydrated, sellerStore]);

  useEffect(() => {
    if (isHydrated && repositories.mode === 'local') void persistSellerOrders(sellerOrders);
  }, [isHydrated, sellerOrders]);

  useEffect(() => {
    if (isHydrated) void persistProductReviews(productReviews);
  }, [isHydrated, productReviews]);

  useEffect(() => {
    if (isHydrated) void persistFitFeedback(fitFeedback);
  }, [fitFeedback, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistAnalyticsEvents(analyticsEvents);
  }, [analyticsEvents, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistCheckoutDetails(checkoutDetails);
  }, [checkoutDetails, isHydrated]);

  useEffect(() => {
    if (isHydrated) void persistTryOnHistory(tryOnHistory);
  }, [isHydrated, tryOnHistory]);

  useEffect(() => {
    if (isHydrated) void persistUserSettings(userSettings);
  }, [isHydrated, userSettings]);

  useEffect(() => {
    if (!isHydrated || !activeChatConversationId) return;

    const snapshot = createChatConversationSnapshot({
      id: activeChatConversationId,
      messages: chatMessages,
      recommendations,
      comparisonRows,
      selectedOutfit,
      selectedProductId,
      currentChatSearchContext,
    });

    setChatConversations((current) => normalizeRecentChatConversations(upsertChatConversation(current, snapshot)));
  }, [
    activeChatConversationId,
    chatMessages,
    comparisonRows,
    currentChatSearchContext,
    isHydrated,
    recommendations,
    selectedOutfit,
    selectedProductId,
  ]);

  useEffect(() => {
    if (isHydrated) void persistChatConversations(chatConversations, activeChatConversationId);
  }, [activeChatConversationId, chatConversations, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !currentUser || syncStatus !== 'synced') return;

    void repositories.userData
      .saveUserData(currentUser.id, {
        styleProfile: profile,
        cartItems,
        favoriteProductIds,
        recentSearches,
        checkoutDetails,
        addresses: addressBook,
        paymentMethods,
        userSettings,
      })
      .catch((error) => {
        setSyncStatus('error');
        setSyncError(getErrorMessage(error));
      });
  }, [addressBook, cartItems, checkoutDetails, currentUser, favoriteProductIds, isHydrated, paymentMethods, profile, recentSearches, syncStatus, userSettings]);

  useEffect(() => {
    if (!isHydrated || !currentUser || currentUser.role !== 'seller' || syncStatus !== 'synced') return;

    void repositories.sellerDrafts
      .saveCurrentDraft(currentUser.id, {
        draft: sellerDraft,
        generatedListing,
        updatedAt: sellerDraftUpdatedAt,
      })
      .catch((error) => {
        setSyncStatus('error');
        setSyncError(getErrorMessage(error));
      });
  }, [currentUser, generatedListing, isHydrated, sellerDraft, sellerDraftUpdatedAt, syncStatus]);

  useEffect(() => {
    if (!isHydrated || !currentUser || currentUser.role !== 'seller' || syncStatus !== 'synced') return;

    void repositories.sellerStores.saveStore(sellerStore).catch((error) => {
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
    });
  }, [currentUser, isHydrated, sellerStore, syncStatus]);

  const selectedProduct = useMemo(
    () => catalog.find((product) => product.id === selectedProductId) ?? catalog[0] ?? products[0],
    [catalog, selectedProductId],
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const product = catalog.find((catalogItem) => catalogItem.id === item.productId);
        return total + (product?.price ?? 0) * item.quantity;
      }, 0),
    [cartItems, catalog],
  );

  const activeCatalog = useMemo(() => getActiveCatalog(catalog), [catalog]);
  const canManageSellerValue = repositories.mode === 'local' || currentUser?.role === 'seller';

  function logEvent(name: AnalyticsEventName, metadata?: AnalyticsEvent['metadata']) {
    if (!stateRef.current.userSettings.privacy.usageAnalyticsEnabled) return;
    setAnalyticsEvents((current) => [...current, createAnalyticsEvent(name, metadata)].slice(-100));
  }

  function recordSearchAnalytics(
    eventType: SearchAnalyticsRecord['eventType'],
    record: Omit<SearchAnalyticsRecord, 'id' | 'eventType' | 'createdAt' | 'sessionId' | 'userId'>,
  ) {
    if (!stateRef.current.userSettings.privacy.usageAnalyticsEnabled) return;
    const payload = createSearchAnalyticsRecord(eventType, {
      ...record,
      sessionId: sessionIdRef.current,
      userId: currentUser?.id,
    });

    if (repositories.mode === 'firebase' && currentUser) {
      void repositories.searchAnalytics.createRecord(payload).catch(() => undefined);
    }
  }

  async function getAuthToken() {
    return repositories.auth.getIdToken?.();
  }

  async function syncRemoteForUser(user: AppUser) {
    if (syncedUserIdRef.current === user.id) return;

    try {
      syncedUserIdRef.current = user.id;
      setSyncStatus('loading');
      setSyncError(undefined);
      const local = stateRef.current;
      const [
        remoteUserData,
        remoteOrders,
        repositoryProducts,
        repositorySellerProducts,
        remoteDraft,
        remoteSellerCreditAccount,
        remoteBuyerCreditAccount,
        remoteBuyerCreditCenter,
        remoteSellerStore,
        remoteSellerRewardCampaigns,
        remoteSellerOrders,
        remoteBuyerSellerOrders,
        remoteReturnRequests,
      ] =
        await Promise.all([
          repositories.userData.getUserData(user.id),
          repositories.orders.listOrders(user.id),
          repositories.products.listProducts(),
          user.role === 'seller' ? repositories.products.listSellerProducts(user.id) : Promise.resolve([]),
          user.role === 'seller' ? repositories.sellerDrafts.getCurrentDraft(user.id) : Promise.resolve(undefined),
          user.role === 'seller' ? repositories.sellerCredits.getAccount(user.id).catch(() => undefined) : Promise.resolve(undefined),
          user.role === 'buyer' ? repositories.buyerCredits.getAccount(user.id).catch(() => undefined) : Promise.resolve(undefined),
          user.role === 'buyer' ? repositories.buyerCredits.getCenter(user.id).catch(() => undefined) : Promise.resolve(undefined),
          user.role === 'seller' ? repositories.sellerStores.getStore(user.id) : Promise.resolve(undefined),
          user.role === 'seller' ? repositories.sellerRewardCampaigns.listCampaigns(user.id).catch(() => []) : Promise.resolve([]),
          user.role === 'seller' ? repositories.sellerOrders.listOrders(user.id).catch(() => []) : Promise.resolve([]),
          user.role === 'buyer' ? repositories.sellerOrders.listBuyerOrders(user.id).catch(() => []) : Promise.resolve([]),
          user.role === 'seller'
            ? repositories.returnRequests.listSellerRequests(user.id).catch(() => [])
            : repositories.returnRequests.listBuyerRequests(user.id).catch(() => []),
        ]);

      const mergedProfile = remoteUserData?.styleProfile ?? local.profile;
      const mergedCartItems = mergeCartItems(local.cartItems, remoteUserData?.cartItems ?? []);
      const mergedFavorites = mergeUniqueStrings(local.favoriteProductIds, remoteUserData?.favoriteProductIds ?? []);
      const mergedRecentSearches = mergeRecentSearches(local.recentSearches, remoteUserData?.recentSearches ?? []);
      const mergedAddresses = mergeById(local.addressBook, remoteUserData?.addresses ?? []);
      const mergedPaymentMethods = mergeById(local.paymentMethods, remoteUserData?.paymentMethods ?? []);
      const mergedOrders = repositories.mode === 'firebase' ? remoteOrders : mergeOrders(local.orders, remoteOrders);
      const mergedCheckoutDetails = normalizeCheckoutDetails(remoteUserData?.checkoutDetails ?? local.checkoutDetails);
      const mergedUserSettings = normalizeUserSettings(remoteUserData?.userSettings ?? local.userSettings);
      const localDraftRecord = sanitizeSellerDraftRecord({
        draft: local.sellerDraft,
        generatedListing: local.generatedListing,
        updatedAt: local.sellerDraftUpdatedAt,
      });
      const selectedDraftRecord = pickNewestDraft(localDraftRecord, remoteDraft ? sanitizeSellerDraftRecord(remoteDraft) : undefined);
      const normalizedDraftRecord = {
        ...selectedDraftRecord,
        generatedListing: selectedDraftRecord.generatedListing
          ? normalizeGeneratedListing(
              selectedDraftRecord.generatedListing,
              selectedDraftRecord.draft,
              0,
              selectedDraftRecord.generatedListing.aiSource ?? 'mock',
            )
          : undefined,
      };
      const mergedSellerProducts =
        repositories.mode === 'firebase' ? repositorySellerProducts : mergeProducts(local.sellerProducts, repositorySellerProducts);
      const mergedSellerStore =
        user.role === 'seller'
          ? remoteSellerStore ?? normalizeSellerStore(local.sellerStore, user.id, user.email)
          : local.sellerStore;
      const mergedSellerOrders =
        user.role === 'seller'
          ? repositories.mode === 'firebase'
            ? remoteSellerOrders
            : mergeSellerOrders(
                local.sellerOrders.filter((order) => order.sellerId === user.id),
                remoteSellerOrders,
              )
          : local.sellerOrders;
      const mergedBuyerSellerOrders =
        user.role === 'buyer'
          ? repositories.mode === 'firebase'
            ? remoteBuyerSellerOrders
            : mergeSellerOrders(
                local.sellerOrders.filter((order) => order.buyerId === user.id),
                remoteBuyerSellerOrders,
              )
          : local.buyerSellerOrders;
      const mergedReturnRequests =
        repositories.mode === 'firebase' ? remoteReturnRequests : mergeById(local.returnRequests, remoteReturnRequests);
      const nextCatalog = mergeProducts(
        getBaseCatalogForRepositoryMode(),
        repositories.mode === 'firebase'
          ? repositoryProducts
          : [...repositoryProducts, ...mergedSellerProducts],
      );
      const activeCatalog = getActiveCatalog(nextCatalog);
      const demoBuyerOrderSeed =
        repositories.mode === 'local'
          ? createDemoBuyerOrderSeed({
              addressBook: mergedAddresses,
              catalog: activeCatalog,
              deliveryOptions,
              paymentMethods: mergedPaymentMethods,
              user,
            })
          : undefined;
      const nextOrders =
        demoBuyerOrderSeed && !mergedOrders.some((order) => order.id === demoBuyerOrderSeed.order.id)
          ? mergeOrders([demoBuyerOrderSeed.order], mergedOrders)
          : mergedOrders;
      const nextBuyerSellerOrders =
        demoBuyerOrderSeed && !mergedBuyerSellerOrders.some((order) => order.id === demoBuyerOrderSeed.sellerOrder.id)
          ? mergeSellerOrders([demoBuyerOrderSeed.sellerOrder], mergedBuyerSellerOrders)
          : mergedBuyerSellerOrders;
      const nextSellerOrders =
        demoBuyerOrderSeed && !mergedSellerOrders.some((order) => order.id === demoBuyerOrderSeed.sellerOrder.id)
          ? mergeSellerOrders([demoBuyerOrderSeed.sellerOrder], mergedSellerOrders)
          : mergedSellerOrders;
      const nextRecommendation = recommendProducts(defaultPrompt, mergedProfile, activeCatalog);

      stateRef.current = {
        profile: mergedProfile,
        catalog: activeCatalog,
        cartItems: mergedCartItems,
        favoriteProductIds: mergedFavorites,
        recentSearches: mergedRecentSearches,
        addressBook: mergedAddresses,
        paymentMethods: mergedPaymentMethods,
        orders: nextOrders,
        returnRequests: mergedReturnRequests,
        checkoutDetails: mergedCheckoutDetails,
        sellerDraft: normalizedDraftRecord.draft,
        sellerDraftUpdatedAt: normalizedDraftRecord.updatedAt,
        generatedListing: normalizedDraftRecord.generatedListing,
        sellerProducts: mergedSellerProducts,
        sellerStore: mergedSellerStore,
        sellerOrders: nextSellerOrders,
        buyerSellerOrders: nextBuyerSellerOrders,
        buyerCreditCenter: remoteBuyerCreditCenter,
        userSettings: mergedUserSettings,
      };
      setProfile(mergedProfile);
      setCartItems(mergedCartItems);
      setFavoriteProductIds(mergedFavorites);
      setRecentSearches(mergedRecentSearches);
      setAddressBook(mergedAddresses);
      setPaymentMethods(mergedPaymentMethods);
      setOrders(nextOrders);
      setReturnRequests(mergedReturnRequests);
      setCheckoutDetails(mergedCheckoutDetails);
      setSellerDraft(normalizedDraftRecord.draft);
      setSellerDraftUpdatedAt(normalizedDraftRecord.updatedAt);
      setGeneratedListing(normalizedDraftRecord.generatedListing);
      setLastAIReasoning(normalizedDraftRecord.generatedListing?.reasoning);
      setSellerCreditAccount(remoteSellerCreditAccount);
      setBuyerCreditAccount(remoteBuyerCreditAccount);
      setBuyerCreditCenter(remoteBuyerCreditCenter);
      setSellerProducts(mergedSellerProducts);
      setSellerStore(mergedSellerStore);
      setSellerRewardCampaigns(remoteSellerRewardCampaigns);
      setSellerStoresById((current) => ({
        ...current,
        [mergedSellerStore.sellerId]: mergedSellerStore,
      }));
      setSellerOrders(nextSellerOrders);
      setBuyerSellerOrders(nextBuyerSellerOrders);
      setUserSettings(mergedUserSettings);
      setCatalog(nextCatalog);
      setRecommendations(nextRecommendation.recommendations);
      setIntent(nextRecommendation.intent);
      setSelectedProductId(nextRecommendation.recommendations[0]?.product.id ?? activeCatalog[0]?.id ?? products[0].id);

      await repositories.userData.saveUserData(user.id, {
        styleProfile: mergedProfile,
        cartItems: mergedCartItems,
        favoriteProductIds: mergedFavorites,
        recentSearches: mergedRecentSearches,
        checkoutDetails: mergedCheckoutDetails,
        addresses: mergedAddresses,
        paymentMethods: mergedPaymentMethods,
        userSettings: mergedUserSettings,
      });
      if (user.role === 'seller') {
        await repositories.sellerDrafts.saveCurrentDraft(user.id, normalizedDraftRecord);
        await repositories.sellerStores.saveStore(mergedSellerStore);
      }

      setSyncStatus('synced');
    } catch (error) {
      syncedUserIdRef.current = undefined;
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
    }
  }

  async function signUp(email: string, password: string, role: UserRole) {
    try {
      setAuthError(undefined);
      const user = await repositories.auth.signUp(email.trim(), password, role);
      await repositories.users.upsertUser(user);
      setCurrentUser(user);
      await syncRemoteForUser(user);
      logEvent('auth_signed_in', { mode: repositories.mode, role });
      return user;
    } catch (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setAuthError(undefined);
      const user = await repositories.auth.signIn(email.trim(), password);
      setCurrentUser(user);
      await syncRemoteForUser(user);
      logEvent('auth_signed_in', { mode: repositories.mode, role: user.role });
      return user;
    } catch (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function signOut() {
    try {
      setAuthError(undefined);
      await repositories.auth.signOut();
      setCurrentUser(undefined);
      setSellerCreditAccount(undefined);
      setBuyerCreditAccount(undefined);
      setBuyerCreditCenter(undefined);
      setSellerRewardCampaigns([]);
      syncedUserIdRef.current = undefined;
      setSyncStatus('idle');
      logEvent('auth_signed_out', { mode: repositories.mode });
    } catch (error) {
      setAuthError(getErrorMessage(error));
    }
  }

  function updateProfile(nextProfile: StyleProfile) {
    setProfile(nextProfile);
    if (currentUser) void repositories.users.updateStyleProfile(currentUser.id, nextProfile);
    const next = recommendProducts(defaultPrompt, nextProfile, activeCatalog);
    setIntent(next.intent);
    setRecommendations(next.recommendations);
    setSelectedProductId(next.recommendations[0]?.product.id ?? activeCatalog[0]?.id ?? products[0].id);
    setChatMessages((current) => [
      ...current,
      assistantMessage('Stil profilin güncellendi; önerileri yeni tercihlerine göre tekrar sıraladım.', 'recommendations'),
    ]);
  }

  function completeOnboardingSetup(nextProfile: StyleProfile, initialPrompt?: string) {
    const prompt = initialPrompt?.trim();
    const recommendationPrompt = prompt || defaultPrompt;
    const next = recommendProducts(recommendationPrompt, nextProfile, activeCatalog);

    setProfile(nextProfile);
    if (currentUser) void repositories.users.updateStyleProfile(currentUser.id, nextProfile);
    setIntent(next.intent);
    setRecommendations(next.recommendations);
    setComparisonRows([]);
    setSelectedProductId(next.recommendations[0]?.product.id ?? activeCatalog[0]?.id ?? products[0].id);
    setPurchaseCompleted(false);
    setTryOnState((current) => ({
      ...current,
      selectedSize: nextProfile.size,
      selectedColor: next.intent.color ?? nextProfile.colors[0] ?? current.selectedColor,
    }));
    setTryOnPreview(undefined);
    setTryOnGenerationStatus('idle');
    setTryOnGenerationError(undefined);
    setChatMessages(
      prompt
        ? [
            assistantMessage('Stil profilini aldım. İlk isteğine göre ürünleri AI Match Score ile sıralıyorum.'),
            userMessage(prompt),
            assistantMessage(
              `İsteğini analiz ettim. ${next.recommendations.length} ürünü stilin, bedenin ve bütçene göre sıraladım.`,
              'recommendations',
            ),
          ]
        : [
            assistantMessage('Profilini aldım. Ana ekranda ne aradığını yazarak AI stilistinle alışverişe başlayabilirsin.'),
            assistantMessage(
              `Başlangıç için ${next.recommendations.length} ürünü beden ve profil bilgine göre sıraladım.`,
              'recommendations',
            ),
          ],
    );
    logEvent('onboarding_completed', {
      gender: nextProfile.audience,
      age: nextProfile.age ?? '',
      size: nextProfile.size,
      styleCount: nextProfile.styles.length,
      occasionCount: nextProfile.occasions.length,
      budgetMax: nextProfile.budgetMax,
      selectedPrompt: prompt || 'none',
    });
    if (prompt) logEvent('chat_prompt_submitted', { prompt, source: 'onboarding' });
  }

  function startNewChat() {
    const nextConversationId = createChatConversationId();
    setActiveChatConversationId(nextConversationId);
    setChatMessages([]);
    setRecommendations([]);
    setComparisonRows([]);
    setCurrentChatSearchContext(undefined);
    setSelectedOutfit(starterOutfit);
    setSelectedProductId(activeCatalog[0]?.id ?? products[0].id);
    setPurchaseCompleted(false);
    logEvent('chat_new_started', { source: 'chat' });
  }

  function openChatConversation(conversationId: string) {
    const conversation = chatConversations.find((item) => item.id === conversationId);
    if (!conversation) return;

    setActiveChatConversationId(conversation.id);
    setChatMessages(conversation.messages);
    setRecommendations(conversation.recommendations);
    setComparisonRows(conversation.comparisonRows);
    setSelectedOutfit(conversation.selectedOutfit);
    setCurrentChatSearchContext(conversation.currentChatSearchContext);
    setSelectedProductId(
      conversation.selectedProductId ??
      conversation.recommendations[0]?.product.id ??
      activeCatalog[0]?.id ??
      products[0].id,
    );
    setPurchaseCompleted(false);
    logEvent('chat_history_opened', { conversationId: conversation.id });
  }

  function submitChatPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setPurchaseCompleted(false);
    setCurrentChatSearchContext(undefined);
    logEvent('chat_prompt_submitted', { prompt: trimmedPrompt });
    setChatMessages((current) => [
      ...current,
      userMessage(trimmedPrompt),
    ]);

    void (async () => {
      try {
        const next = await recommendProductsWithRemote(trimmedPrompt, profile, activeCatalog, {
          authToken: await getAuthToken(),
        });
        setIntent(next.intent);
        setRecommendations(next.recommendations);
        setCurrentChatSearchContext({
          searchId: next.searchId,
          query: trimmedPrompt,
          surface: 'chat',
          source: next.source ?? 'local',
          resultIds: next.recommendations.map((item) => item.product.id),
          mode: next.mode ?? 'default',
          createdAt: new Date().toISOString(),
        });
        setComparisonRows([]);
        setSelectedProductId(next.recommendations[0]?.product.id ?? activeCatalog[0]?.id ?? products[0].id);
        setChatMessages((current) => [
          ...current,
          assistantMessage(
            next.explanation ?? `İsteğini analiz ettim. ${next.recommendations.length} ürünü AI Match Score'a göre sıraladım.`,
            'recommendations',
            buildSuggestedActions(),
          ),
        ]);
      } catch (error) {
        setChatMessages((current) => [
          ...current,
          assistantMessage(
            isDailyChatLimitError(error)
              ? getDailyChatLimitMessage()
              : 'AI sohbet isteği tamamlanamadı. Biraz sonra tekrar deneyebilirsin.',
          ),
        ]);
      }
    })();
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setTryOnPreview(undefined);
    setTryOnGenerationStatus('idle');
    setTryOnGenerationError(undefined);
  }

  function addToCart(productId: string, size?: string, metadata?: AnalyticsEvent['metadata']) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;

    const selectedSize = size ?? (product.sizes.includes(profile.size) ? profile.size : product.sizes[0]);
    const searchAttribution = extractCartSearchAttribution(metadata);
    setCartItems((current) => upsertCartItem(current, productId, selectedSize, searchAttribution));
    setPurchaseCompleted(false);
    logEvent('add_to_cart', { productId, size: selectedSize, ...metadata });
    if (searchAttribution?.searchId && searchAttribution.searchSurface) {
      recordSearchAnalytics('search_result_add_to_cart', {
        source: searchAttribution.searchSurface,
        query: searchAttribution.searchQuery,
        searchId: searchAttribution.searchId,
        mode: searchAttribution.searchMode,
        productId,
      });
    }
  }

  function addOutfitToCart(outfit: Outfit) {
    outfit.productIds.forEach((productId) => addToCart(productId));
  }

  function incrementCartItem(productId: string, size: string) {
    setCartItems((current) =>
      current.map((item) =>
        item.productId === productId && item.size === size
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  }

  function decrementCartItem(productId: string, size: string) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeCartItem(productId: string, size: string) {
    setCartItems((current) => current.filter((item) => item.productId !== productId || item.size !== size));
  }

  function updateCartItemSize(productId: string, previousSize: string, nextSize: string) {
    if (previousSize === nextSize) return;
    setCartItems((current) => {
      const item = current.find((cartItem) => cartItem.productId === productId && cartItem.size === previousSize);
      if (!item) return current;
      const withoutPrevious = current.filter(
        (cartItem) => cartItem.productId !== productId || cartItem.size !== previousSize,
      );
      const existing = withoutPrevious.find(
        (cartItem) => cartItem.productId === productId && cartItem.size === nextSize,
      );
      if (existing) {
        return withoutPrevious.map((cartItem) =>
          cartItem.productId === productId && cartItem.size === nextSize
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem,
        );
      }
      return [...withoutPrevious, { ...item, size: nextSize }];
    });
  }

  function clearCart() {
    setCartItems([]);
    setPurchaseCompleted(false);
  }

  async function completePurchase(): Promise<Order | undefined> {
    const validationErrors = getCheckoutValidationErrors();
    if (validationErrors.length > 0) {
      logEvent('checkout_validation_failed', { errorCount: validationErrors.length });
      setSyncStatus('error');
      setSyncError(validationErrors[0]);
      return undefined;
    }
    if (repositories.mode === 'firebase' && !currentUser) {
      setSyncStatus('error');
      setSyncError('Siparişi tamamlamak için giriş yapılmalı.');
      return undefined;
    }

    const createdAt = new Date().toISOString();
    const selectedAddress = addressBook.find((address) => address.id === checkoutDetails.addressId);
    const selectedPaymentMethod = paymentMethods.find((paymentMethod) => paymentMethod.id === checkoutDetails.paymentMethodId);
    const selectedDeliveryOption =
      deliveryOptions.find((option) => option.id === checkoutDetails.deliveryOptionId) ?? deliveryOptions[0];
    const order: Order = {
      id: `order-${Date.now()}`,
      buyerId: currentUser?.id,
      buyerEmail: currentUser?.email,
      items: cartItems,
      subtotal: cartTotal,
      shipping: selectedDeliveryOption.price,
      total: cartTotal + selectedDeliveryOption.price,
      addressLabel: getAddressLabel(checkoutDetails.addressId, addressBook),
      addressSnapshot: selectedAddress,
      paymentLabel: getPaymentLabel(checkoutDetails.paymentMethodId, paymentMethods),
      paymentSnapshot: selectedPaymentMethod,
      deliveryOptionId: selectedDeliveryOption.id,
      deliveryLabel: selectedDeliveryOption.label,
      deliveryEta: selectedDeliveryOption.eta,
      deliverySnapshot: selectedDeliveryOption,
      note: checkoutDetails.note?.trim(),
      createdAt,
      updatedAt: createdAt,
    };
    const nextSellerOrders = buildSellerOrdersFromCart(order, catalog, currentUser);
    order.sellerOrderIds = nextSellerOrders.map((sellerOrder) => sellerOrder.id);
    order.statusSummary = buildOrderStatusSummary(nextSellerOrders);

    let committedOrder: Order = order;
    let committedSellerOrders: SellerOrder[] = nextSellerOrders;
    let committedBuyerCredits: BuyerCreditAccount | undefined;

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const checkoutResult = await repositories.checkout.createCheckout({
        buyerId: currentUser?.id ?? 'demo-local-user',
        order,
        sellerOrders: nextSellerOrders,
      });
      committedOrder = checkoutResult.order;
      committedSellerOrders = checkoutResult.sellerOrders;
      committedBuyerCredits = checkoutResult.buyerCredits;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Sipariş oluşturulamadı: ${getErrorMessage(error)}`);
      logEvent('checkout_commit_failed', { error: getErrorMessage(error) });
      return undefined;
    }

    setOrders((current) => [committedOrder, ...current]);
    if (committedSellerOrders.length > 0) {
      setSellerOrders((current) => mergeSellerOrders(committedSellerOrders, current));
      setBuyerSellerOrders((current) => mergeSellerOrders(committedSellerOrders, current));
    }
    if (committedBuyerCredits) {
      setBuyerCreditAccount(committedBuyerCredits);
      void refreshBuyerCreditCenter();
    }
    if (repositories.mode === 'local') {
      setCatalog((current) =>
        current.map((product) => {
          const purchased = cartItems.find((item) => item.productId === product.id);
          return purchased ? { ...product, stock: Math.max(0, product.stock - purchased.quantity) } : product;
        }),
      );
      setSellerProducts((current) =>
        current.map((product) => {
          const purchased = cartItems.find((item) => item.productId === product.id);
          return purchased ? { ...product, stock: Math.max(0, product.stock - purchased.quantity) } : product;
        }),
      );
    }
    setCartItems([]);
    setPurchaseCompleted(true);
    setSyncStatus('synced');
    const searchAttributedItems = committedOrder.items.filter((item) => item.searchId && item.searchSurface);
    searchAttributedItems.forEach((item) => {
      recordSearchAnalytics('search_result_purchase_completed', {
        source: item.searchSurface!,
        query: item.searchQuery,
        searchId: item.searchId,
        mode: item.searchMode,
        productId: item.productId,
      });
      logEvent('purchase_completed', sanitizeMetadata({
        productId: item.productId,
        searchId: item.searchId,
        query: item.searchQuery ?? 'all',
        mode: item.searchMode ?? 'default',
        source: item.searchSurface,
        searchSource: item.searchEngineSource ?? 'local',
      }));
    });
    logEvent('purchase_completed', {
      total: committedOrder.total,
      itemCount: committedOrder.items.length,
      sellerOrderCount: committedSellerOrders.length,
      deliveryOptionId: selectedDeliveryOption.id,
    });
    setChatMessages((current) => [
      ...current,
      assistantMessage('Siparişin oluşturuldu. Sipariş durumunu Profil > Siparişlerim alanından takip edebilirsin.'),
    ]);
    return committedOrder;
  }

  function updateCheckoutDetails(details: Partial<CheckoutDetails>) {
    setCheckoutDetails((current) => ({ ...current, ...details }));
  }

  function getCheckoutValidationErrors() {
    const errors: string[] = [];
    if (cartItems.length === 0) errors.push('Sepetin boş.');
    if (!addressBook.some((address) => address.id === checkoutDetails.addressId)) {
      errors.push('Teslimat adresi seçilmeli.');
    }
    if (!paymentMethods.some((paymentMethod) => paymentMethod.id === checkoutDetails.paymentMethodId)) {
      errors.push('Ödeme yöntemi seçilmeli.');
    }
    if (!deliveryOptions.some((option) => option.id === checkoutDetails.deliveryOptionId)) {
      errors.push('Teslimat seçeneği belirlenmeli.');
    }
    return errors;
  }

  function saveAddress(
    address: Partial<AddressBookEntry> & Pick<AddressBookEntry, 'label' | 'recipient' | 'phone' | 'line1' | 'city' | 'district'>,
  ) {
    const now = new Date().toISOString();
    const normalized: AddressBookEntry = {
      id: address.id ?? `address-${Date.now()}`,
      label: address.label.trim(),
      recipient: address.recipient.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      line2: address.line2?.trim(),
      city: address.city.trim(),
      district: address.district.trim(),
      note: address.note?.trim(),
      isDefault: address.isDefault ?? !addressBook.some((item) => item.isDefault),
      createdAt: address.createdAt ?? now,
      updatedAt: now,
    };
    setAddressBook((current) => upsertEntity(current, normalized));
    if (normalized.isDefault || !checkoutDetails.addressId) {
      setCheckoutDetails((current) => ({ ...current, addressId: normalized.id }));
    }
  }

  function removeAddress(addressId: string) {
    setAddressBook((current) => {
      const next = current.filter((address) => address.id !== addressId);
      const fallbackId = next[0]?.id ?? '';
      setCheckoutDetails((details) =>
        details.addressId === addressId ? { ...details, addressId: fallbackId } : details,
      );
      return next;
    });
  }

  function savePaymentMethod(
    paymentMethod: Partial<SavedPaymentMethod> & Pick<SavedPaymentMethod, 'label' | 'holderName' | 'brand' | 'last4' | 'expiryMonth' | 'expiryYear' | 'type'>,
  ) {
    const now = new Date().toISOString();
    const normalized: SavedPaymentMethod = {
      id: paymentMethod.id ?? `payment-${Date.now()}`,
      label: paymentMethod.label.trim(),
      holderName: paymentMethod.holderName.trim(),
      brand: paymentMethod.brand.trim(),
      last4: paymentMethod.last4.trim(),
      expiryMonth: paymentMethod.expiryMonth.trim(),
      expiryYear: paymentMethod.expiryYear.trim(),
      type: paymentMethod.type,
      isDefault: paymentMethod.isDefault ?? !paymentMethods.some((item) => item.isDefault),
      createdAt: paymentMethod.createdAt ?? now,
      updatedAt: now,
    };
    setPaymentMethods((current) => upsertEntity(current, normalized));
    if (normalized.isDefault || !checkoutDetails.paymentMethodId) {
      setCheckoutDetails((current) => ({ ...current, paymentMethodId: normalized.id }));
    }
  }

  function removePaymentMethod(paymentMethodId: string) {
    setPaymentMethods((current) => {
      const next = current.filter((paymentMethod) => paymentMethod.id !== paymentMethodId);
      const fallbackId = next[0]?.id ?? '';
      setCheckoutDetails((details) =>
        details.paymentMethodId === paymentMethodId ? { ...details, paymentMethodId: fallbackId } : details,
      );
      return next;
    });
  }

  function updateNotificationSettings(patch: Partial<UserNotificationSettings>) {
    setUserSettings((current) => normalizeUserSettings({
      ...current,
      notifications: {
        ...current.notifications,
        ...patch,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updatePrivacySettings(patch: Partial<UserPrivacySettings>) {
    setUserSettings((current) => normalizeUserSettings({
      ...current,
      privacy: {
        ...current.privacy,
        ...patch,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  function saveRecentSearch(query: string, filters?: SearchIntentFilters) {
    if (!stateRef.current.userSettings.privacy.personalizationEnabled) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    const nextEntry: RecentSearchEntry = {
      id: `search-${Date.now()}`,
      query: trimmed,
      category: filters?.category,
      color: filters?.color,
      size: filters?.size,
      occasion: filters?.occasion,
      styles: filters?.styles ?? [],
      createdAt: new Date().toISOString(),
    };

    setRecentSearches((current) => {
      const withoutDuplicate = current.filter(
        (entry) => entry.query.trim().toLocaleLowerCase('tr-TR') !== trimmed.toLocaleLowerCase('tr-TR'),
      );
      return [nextEntry, ...withoutDuplicate].slice(0, 8);
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);
  }

  function setCatalogSearchContext(context?: SearchContext) {
    setCurrentCatalogSearchContext(context);
  }

  function toggleFavorite(productId: string, metadata?: AnalyticsEvent['metadata']) {
    setFavoriteProductIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      logEvent('favorite_toggled', { productId, active: next.includes(productId), ...metadata });
      return next;
    });
  }

  function isFavorite(productId: string) {
    return favoriteProductIds.includes(productId);
  }

  function askWhy(productId: string) {
    const recommendation = recommendations.find((item) => item.product.id === productId);
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;

    setChatMessages((current) => [
      ...current,
      userMessage(`${product.title} ürününü neden önerdin?`),
      assistantMessage(recommendation?.reason ?? `${product.title}, profilindeki stil tercihleriyle uyumlu.`),
    ]);
  }

  function requestCheaper(productId: string) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;

    const cheaper = findCheaperAlternatives(product, activeCatalog, profile);
    setRecommendations(cheaper.length > 0 ? cheaper : recommendations);
    setComparisonRows([]);
    setChatMessages((current) => [
      ...current,
      userMessage(`${product.title} için daha uygun fiyatlı alternatif bul.`),
      assistantMessage(
        cheaper.length > 0
          ? `${product.title} ürününden daha uygun fiyatlı ${cheaper.length} alternatif buldum.`
          : 'Bu ürün için daha uygun fiyatlı güçlü bir alternatif bulamadım.',
        'recommendations',
      ),
    ]);
  }

  function buildContextRecommendations(prompt: string, products: Product[], fallbackProduct: Product) {
    const scopedCatalog = products.length > 0 ? products : activeCatalog.filter((item) => item.id !== fallbackProduct.id);
    return recommendProducts(prompt, profile, scopedCatalog).recommendations;
  }

  function requestChatFollowUp(productId: string, mode: ChatFollowUpMode) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;

    const prompt = buildFollowUpPrompt(product, mode);
    logEvent('chat_follow_up_requested', {
      productId,
      mode,
      searchId: currentChatSearchContext?.searchId ?? 'none',
      query: currentChatSearchContext?.query ?? prompt,
    });
    recordSearchAnalytics('chat_follow_up_requested', {
      source: 'chat',
      query: prompt,
      searchId: currentChatSearchContext?.searchId,
      mode,
      anchorProductId: productId,
      productId,
      resultCount: currentChatSearchContext?.resultIds.length,
      resultIds: currentChatSearchContext?.resultIds,
      filters: currentChatSearchContext
        ? {
            source: currentChatSearchContext.source,
          }
        : undefined,
    });

    void (async () => {
      try {
        const next = await recommendProductsWithRemote(prompt, profile, activeCatalog, {
          mode,
          anchorProductId: productId,
          limit: 6,
          authToken: await getAuthToken(),
        });
        setIntent(next.intent);
        setRecommendations(next.recommendations);
        setComparisonRows([]);
        setSelectedProductId(next.recommendations[0]?.product.id ?? product.id);
        setCurrentChatSearchContext({
          searchId: next.searchId,
          query: prompt,
          surface: 'chat',
          source: next.source ?? 'local',
          resultIds: next.recommendations.map((item) => item.product.id),
          mode,
          anchorProductId: productId,
          createdAt: new Date().toISOString(),
        });
        setChatMessages((current) => [
          ...current,
          userMessage(prompt),
          assistantMessage(
            next.explanation ?? `${next.recommendations.length} alternatif sıralandı.`,
            'recommendations',
            buildSuggestedActions(mode),
          ),
        ]);
      } catch (error) {
        setChatMessages((current) => [
          ...current,
          userMessage(prompt),
          assistantMessage(
            isDailyChatLimitError(error)
              ? getDailyChatLimitMessage()
              : 'AI sohbet isteği tamamlanamadı. Biraz sonra tekrar deneyebilirsin.',
          ),
        ]);
      }
    })();
  }

  function requestSameSeller(productId: string) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    logEvent('chat_same_seller_requested', { productId, sellerId: product.sellerId ?? '' });
    requestChatFollowUp(productId, 'same_seller');
  }

  function requestSimilarBudget(productId: string) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    logEvent('chat_similar_budget_requested', { productId, price: product.price });
    requestChatFollowUp(productId, 'similar_budget');
  }

  function requestSimilarProducts(productId: string) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    logEvent('chat_similar_products_requested', { productId, category: product.category });
    requestChatFollowUp(productId, 'similar_products');
  }

  function createOutfit(productId: string) {
    const product = catalog.find((item) => item.id === productId) ?? selectedProduct;
    const outfit = createOutfitForProduct(product, activeCatalog);
    setSelectedOutfit(outfit);
    setChatMessages((current) => [
      ...current,
      userMessage(`${product.title} ürününü kombinle.`),
      assistantMessage(outfit.explanation, 'outfit'),
    ]);
    return outfit;
  }

  function compareTopProducts() {
    const rows = buildComparisonRows(recommendations, profile);
    setComparisonRows(rows);
    setChatMessages((current) => [
      ...current,
      userMessage('İlk üç ürünü karşılaştır.'),
      assistantMessage(compareRecommendations(recommendations), 'comparison'),
    ]);
  }

  function updateTryOnState(state: Partial<TryOnState>) {
    setTryOnState((current) => ({ ...current, ...state }));
    setTryOnPreview(undefined);
    setTryOnGenerationStatus('idle');
    setTryOnGenerationError(undefined);
  }

  async function generateTryOnPreview() {
    setTryOnGenerationStatus('loading');
    setTryOnGenerationError(undefined);

    try {
      const creditCost = getTryOnCreditCost();
      let activeBuyerCreditAccount = buyerCreditAccount;
      if (currentUser?.role === 'buyer' && !activeBuyerCreditAccount) {
        activeBuyerCreditAccount = await refreshBuyerCredits();
      }
      const sponsoredTryOnTask = currentUser?.role === 'buyer'
        ? getSponsoredTryOnTaskForProduct(selectedProduct.id)
        : undefined;
      if (
        currentUser?.role === 'buyer' &&
        !sponsoredTryOnTask &&
        activeBuyerCreditAccount &&
        activeBuyerCreditAccount.freeCredits + activeBuyerCreditAccount.paidCredits < creditCost
      ) {
        setTryOnGenerationStatus('error');
        setTryOnGenerationError('Kabin jetonun yetersiz. Yeni deneme oluşturmak için jeton eklemen gerekiyor.');
        return;
      }

      let modelImageUri = getTryOnModelUri(tryOnState, selectedProduct);
      let modelImageStoragePath: string | undefined;
      const userId = currentUser?.id;

      if (tryOnState.mode === 'photo' && modelImageUri && !modelImageUri.startsWith('http') && userId) {
        const upload = await uploadTryOnInputImage(modelImageUri, userId);
        modelImageUri = upload.downloadUrl;
        modelImageStoragePath = upload.storagePath;
      }

      const input = buildTryOnInput(
        selectedProduct,
        tryOnState,
        modelImageUri,
        selectedOutfit.productIds,
        modelImageStoragePath,
      );
      if (currentUser?.role === 'buyer' && repositories.mode === 'local' && !sponsoredTryOnTask) {
        const nextAccount = await repositories.buyerCredits.spendTryOnCredit?.(currentUser.id);
        if (nextAccount) setBuyerCreditAccount(nextAccount);
      }
      const result = await generateTryOn(input, {
        authToken: await repositories.auth.getIdToken?.(),
      });
      if (result.buyerCredits) {
        setBuyerCreditAccount(result.buyerCredits);
      } else if (currentUser?.role === 'buyer') {
        void refreshBuyerCredits();
      }
      setTryOnPreview(result.preview);
      if (stateRef.current.userSettings.privacy.tryOnHistoryEnabled) {
        setTryOnHistory((current) => [
          result.preview,
          ...current.filter((preview) => preview.id !== result.preview.id),
        ].slice(0, 12));
      }
      setTryOnGenerationStatus('ready');
      if (result.diagnostics?.fallbackReason) {
        setTryOnGenerationError(
          `Remote try-on endpoint kullanılamadı; mock fallback çalıştı. ${result.diagnostics.fallbackReason}`,
        );
      }
      logEvent('try_on_preview_generated', {
        productId: selectedProduct.id,
        source: result.preview.source,
        confidence: result.preview.confidence,
      });
    } catch (error) {
      setTryOnGenerationStatus('error');
      if (isInsufficientAICreditsError(error)) {
        setTryOnGenerationError('Kabin jetonun yetersiz. Yeni deneme oluşturmak için jeton eklemen gerekiyor.');
        void refreshBuyerCredits();
        return;
      }
      setTryOnGenerationError(getErrorMessage(error));
    }
  }

  function restoreTryOnPreview(previewId: string) {
    const preview = tryOnHistory.find((item) => item.id === previewId);
    if (!preview) return;

    setSelectedProductId(preview.productId);
    setTryOnPreview(preview);
    setTryOnGenerationStatus('ready');
    setTryOnGenerationError(undefined);
    setTryOnState((current) => ({
      ...current,
      mode: preview.mode,
      avatarUri: preview.mode === 'avatar' ? preview.modelImageUri : current.avatarUri,
      photoUri: preview.mode === 'photo' ? preview.modelImageUri : current.photoUri,
      selectedSize: preview.selectedSize,
      selectedColor: preview.selectedColor,
      environment: preview.environment ?? current.environment,
    }));
  }

  function recordTryOnToCheckout() {
    logEvent('try_on_to_checkout', { productId: selectedProduct.id });
  }

  function requireSellerAccess() {
    if (canManageSellerValue) return true;

    const message =
      repositories.mode === 'firebase' && currentUser
        ? 'Bu işlem için seller rolü gerekiyor.'
        : 'Bu işlem için Firebase auth ile seller olarak giriş yapılmalı.';
    setSyncStatus('error');
    setSyncError(message);
    return false;
  }

  function updateSellerDraft(draft: Partial<SellerDraft>) {
    setSellerDraftUpdatedAt(new Date().toISOString());
    if (typeof draft.imageUrl === 'string') {
      setProductImageEnhancementPreview(undefined);
      setProductImageEnhancementStatus('idle');
      setProductImageEnhancementError(undefined);
    }
    setSellerDraft((current) => ({ ...current, ...draft }));
  }

  async function refreshBuyerCredits() {
    if (!currentUser || currentUser.role !== 'buyer') {
      setBuyerCreditAccount(undefined);
      return undefined;
    }

    try {
      setBuyerCreditLoading(true);
      const account = await repositories.buyerCredits.getAccount(currentUser.id);
      setBuyerCreditAccount(account);
      return account;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Kabin jeton bilgisi alınamadı: ${getErrorMessage(error)}`);
      return undefined;
    } finally {
      setBuyerCreditLoading(false);
    }
  }

  async function refreshBuyerCreditCenter() {
    if (!currentUser || currentUser.role !== 'buyer') {
      setBuyerCreditCenter(undefined);
      setBuyerCreditAccount(undefined);
      return undefined;
    }

    try {
      setBuyerCreditLoading(true);
      const center = await repositories.buyerCredits.getCenter(currentUser.id);
      setBuyerCreditCenter(center);
      if (center?.account) setBuyerCreditAccount(center.account);
      return center;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Jeton merkezi alınamadı: ${getErrorMessage(error)}`);
      return undefined;
    } finally {
      setBuyerCreditLoading(false);
    }
  }

  async function claimBuyerCampaignReward(sellerId: string, campaignId: string) {
    if (!currentUser || currentUser.role !== 'buyer') {
      setSyncStatus('error');
      setSyncError('Kampanya jetonu almak için müşteri hesabıyla giriş yapmalısın.');
      return;
    }

    try {
      setBuyerCreditLoading(true);
      setSyncError(undefined);
      const result = await repositories.buyerCredits.claimCampaignReward(currentUser.id, { sellerId, campaignId });
      setBuyerCreditAccount(result.buyerCredits);
      await refreshBuyerCreditCenter();
      logEvent('buyer_credit_campaign_claimed', {
        sellerId,
        campaignId,
        rewardCredits: result.campaign.rewardCredits,
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Kampanya jetonu alınamadı: ${getErrorMessage(error)}`);
    } finally {
      setBuyerCreditLoading(false);
    }
  }

  function getSponsoredTryOnTaskForProduct(productId: string) {
    const product = stateRef.current.catalog.find((item) => item.id === productId);
    return stateRef.current.buyerCreditCenter?.tasks.find((task) =>
      task.type === 'sponsored_try_on' &&
      (
        task.productId === productId ||
        (!task.productId && product?.sellerId && task.sellerId === product.sellerId)
      ),
    );
  }

  async function refreshSellerCredits() {
    if (!currentUser || currentUser.role !== 'seller') {
      setSellerCreditAccount(undefined);
      return undefined;
    }

    try {
      setSellerCreditLoading(true);
      const account = await repositories.sellerCredits.getAccount(currentUser.id);
      setSellerCreditAccount(account);
      return account;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`AI kredi bilgisi alınamadı: ${getErrorMessage(error)}`);
      return undefined;
    } finally {
      setSellerCreditLoading(false);
    }
  }

  async function purchaseSellerCreditPackage(packageId: SellerCreditPackageId) {
    if (!requireSellerAccess() || !currentUser) return;

    setSellerCreditPurchaseStatus('loading');
    setSellerCreditPurchaseError(undefined);
    try {
      const result = await repositories.sellerCredits.purchasePackage(currentUser.id, packageId);
      setSellerCreditAccount(result.sellerCredits);
      setSellerCreditPurchaseStatus('ready');
      logEvent('seller_ai_credit_package_claimed', {
        packageId: result.package.id,
        credits: result.package.credits,
        amountTRY: result.package.amountTRY,
        creditDebtAmount: result.sellerCredits.creditDebtAmount,
      });
    } catch (error) {
      setSellerCreditPurchaseStatus('error');
      setSellerCreditPurchaseError(getErrorMessage(error));
    }
  }

  function setProductImageEnhancementMode(mode: ProductImageEnhancementMode) {
    setSelectedProductImageEnhancementMode(mode);
    setProductImageEnhancementPreview(undefined);
    setProductImageEnhancementStatus('idle');
    setProductImageEnhancementError(undefined);
  }

  async function enhanceSellerProductImage() {
    if (!requireSellerAccess() || !currentUser) return;
    const imageUrl = sellerDraft.imageUrl.trim();
    const cost = getProductImageEnhanceCost();

    if (!imageUrl) {
      setProductImageEnhancementStatus('error');
      setProductImageEnhancementError('Profesyonelleştirmek için önce ürün görseli eklemelisin.');
      return;
    }
    if (sellerCreditAccount && sellerCreditAccount.freeCredits + sellerCreditAccount.paidCredits < cost) {
      setProductImageEnhancementStatus('error');
      setProductImageEnhancementError('Bu işlem için yeterli jetonun yok. Jeton Cüzdanı’ndan kredi ekleyebilirsin.');
      return;
    }

    setProductImageEnhancementStatus('loading');
    setProductImageEnhancementError(undefined);
    setProductImageEnhancementPreview(undefined);
    try {
      const result = await enhanceProductImage(
        {
          imageUrl,
          mode: selectedProductImageEnhancementMode,
          draftContext: sellerDraft,
        },
        {
          authToken: await repositories.auth.getIdToken?.(),
        },
      );
      if (!result.enhancedImageUrl) {
        throw new Error('AI görsel sonucu alınamadı.');
      }
      if (result.sellerCredits) {
        setSellerCreditAccount(result.sellerCredits);
      }
      setProductImageEnhancementPreview({
        ...result,
        originalImageUrl: imageUrl,
      });
      setProductImageEnhancementStatus('ready');
      logEvent('seller_product_ai_improved', {
        type: 'product_image_enhancement',
        source: result.source,
        mode: result.mode,
        cost: result.cost,
      });
    } catch (error) {
      setProductImageEnhancementStatus('error');
      if (isInsufficientAICreditsError(error)) {
        setProductImageEnhancementError('Bu işlem için yeterli jetonun yok. Jeton Cüzdanı’ndan kredi ekleyebilirsin.');
        void refreshSellerCredits();
        return;
      }
      setProductImageEnhancementError(getErrorMessage(error));
    }
  }

  function acceptEnhancedProductImage() {
    if (!productImageEnhancementPreview) return;
    updateSellerDraft({ imageUrl: productImageEnhancementPreview.enhancedImageUrl });
    setProductImageEnhancementPreview(undefined);
    setProductImageEnhancementStatus('idle');
    setProductImageEnhancementError(undefined);
  }

  function discardEnhancedProductImage() {
    setProductImageEnhancementPreview(undefined);
    setProductImageEnhancementStatus('idle');
    setProductImageEnhancementError(undefined);
  }

  async function runProductIntelligence(variant: number, regenerated = false) {
    if (!requireSellerAccess()) return;
    if (sellerCreditAccount && sellerCreditAccount.freeCredits + sellerCreditAccount.paidCredits < 1) {
      setAIGenerationStatus('error');
      setAIGenerationError('AI kredin kalmadı. Kredi paketlerinden birini kullanarak devam edebilirsin.');
      return;
    }

    setSellerDraftUpdatedAt(new Date().toISOString());
    setAIGenerationStatus('loading');
    setAIGenerationError(undefined);
    try {
      const result = await generateProductIntelligence(
        {
          draft: sellerDraft,
          previousListing: generatedListing,
          variant,
        },
        {
          authToken: await repositories.auth.getIdToken?.(),
        },
      );
      if (result.sellerCredits) {
        setSellerCreditAccount(result.sellerCredits);
      }
      const listing = result.diagnostics?.fallbackReason
        ? {
            ...result.listing,
            aiSource: 'manual' as const,
            reasoning: 'AI tamamlanamadı; bu taslak manuel düzenleme için hazırlandı.',
            recommendation: 'Alanları kontrol edip gerekli düzenlemeleri yaptıktan sonra ürünü yayına alabilirsin.',
          }
        : result.listing;
      setGeneratedListing(listing);
      setLastAIReasoning(listing.reasoning);
      setAIGenerationStatus('ready');
      if (result.diagnostics?.fallbackReason) {
        setAIGenerationError(
          `AI tamamlanamadı; alanları elle düzenleyip devam edebilirsin. ${result.diagnostics.fallbackReason}`,
        );
      }
      logEvent('seller_listing_generated', {
        score: listing.visibilityScore,
        regenerated,
        source: listing.aiSource,
        confidence: listing.confidence,
      });
    } catch (error) {
      setAIGenerationStatus('error');
      if (isInsufficientAICreditsError(error)) {
        setAIGenerationError('AI kredin kalmadı. Kredi paketlerinden birini kullanarak devam edebilirsin.');
        void refreshSellerCredits();
        return;
      }
      setAIGenerationError(getErrorMessage(error));
    }
  }

  async function generateSellerListing() {
    await runProductIntelligence(listingVersion, false);
  }

  async function regenerateSellerListing() {
    const nextVersion = listingVersion + 1;
    setListingVersion(nextVersion);
    await runProductIntelligence(nextVersion, true);
  }

  function updateGeneratedListing(listing: Partial<GeneratedListing>) {
    setSellerDraftUpdatedAt(new Date().toISOString());
    setGeneratedListing((current) => (current ? { ...current, ...listing } : current));
  }

  async function publishListing() {
    if (!generatedListing) return;
    if (!requireSellerAccess()) return;
    if (repositories.mode === 'firebase' && !isRemoteHttpUrl(sellerDraft.imageUrl)) {
      setSyncStatus('error');
      setSyncError('Firebase modunda ürün yayına alınmadan önce görsel Storage’a yüklenmeli veya geçerli bir HTTP/HTTPS görsel URL’i kullanılmalı.');
      return;
    }

    const published = { ...generatedListing, status: 'published' as const };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const createdProduct = await repositories.products.publishProduct({ draft: sellerDraft, listing: published });
      if (repositories.mode === 'local') {
        setPublishedListings((current) => [published, ...current]);
      }
      setSellerProducts((current) => upsertProductInList(current, createdProduct));
      setCatalog((current) => upsertProductInCatalog(current, createdProduct));
      resetSellerAddDraft();
      setSyncStatus('synced');
      logEvent('seller_listing_published', { productId: createdProduct.id, score: published.visibilityScore });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Ürün yayınlanamadı: ${getErrorMessage(error)}`);
    }
  }

  function resetSellerAddDraft() {
    const now = new Date().toISOString();
    const nextDraft = createDefaultSellerDraft();
    const resetRecord: SellerDraftRecord = {
      draft: nextDraft,
      updatedAt: now,
    };

    setSellerDraft(nextDraft);
    setSellerDraftUpdatedAt(now);
    setGeneratedListing(undefined);
    setLastAIReasoning(undefined);
    setAIGenerationStatus('idle');
    setAIGenerationError(undefined);
    setProductImageEnhancementStatus('idle');
    setProductImageEnhancementError(undefined);
    setProductImageEnhancementPreview(undefined);
    setSelectedProductImageEnhancementMode('catalog_white');
    setListingVersion(0);

    void persistSellerDraft(nextDraft).catch(() => undefined);
    void persistSellerDraftUpdatedAt(now).catch(() => undefined);
    void persistGeneratedListing(undefined).catch(() => undefined);

    if (currentUser?.role === 'seller') {
      void repositories.sellerDrafts.saveCurrentDraft(currentUser.id, resetRecord).catch((error) => {
        setSyncStatus('error');
        setSyncError(`Yeni ürün taslağı sıfırlanamadı: ${getErrorMessage(error)}`);
      });
    }
  }

  async function updateSellerProduct(productId: string, patch: Partial<Product>) {
    if (!requireSellerAccess()) return;
    const existingProduct = sellerProducts.find((product) => product.id === productId);
    if (!existingProduct) return;

    const updatedPatch = sanitizeSellerProductPatch({ ...patch, updatedAt: new Date().toISOString() });
    const nextProduct = { ...existingProduct, ...updatedPatch };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.products.updateProduct(productId, updatedPatch);
      setSellerProducts((current) => upsertProductInList(current, nextProduct));
      setCatalog((current) => upsertProductInCatalog(current, nextProduct));
      setSyncStatus('synced');
      logEvent('seller_product_updated', { productId });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Ürün güncellenemedi: ${getErrorMessage(error)}`);
    }
  }

  async function updateSellerProductSizeChart(productId: string, sizeChart: SizeChart) {
    await updateSellerProduct(productId, { sizeChart });
  }

  async function archiveSellerProduct(productId: string) {
    await updateProductStatus(productId, 'archived', 'seller_product_archived');
  }

  async function activateSellerProduct(productId: string) {
    await updateProductStatus(productId, 'active', 'seller_product_activated');
  }

  async function deleteSellerProduct(productId: string) {
    if (!requireSellerAccess()) return;
    const existingProduct = sellerProducts.find((product) => product.id === productId);
    if (!existingProduct) return;

    if (existingProduct.status !== 'archived') {
      setSyncStatus('error');
      setSyncError('Ürün silinmeden önce arşivlenmeli.');
      return;
    }

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.products.deleteProduct(productId);
      setSellerProducts((current) => current.filter((product) => product.id !== productId));
      setCatalog((current) => current.filter((product) => product.id !== productId));
      setSyncStatus('synced');
      logEvent('seller_product_deleted', { productId });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Ürün silinemedi: ${getErrorMessage(error)}`);
    }
  }

  async function createSellerRewardCampaign(type: SellerRewardCampaign['type'], overrides: Partial<SellerRewardCampaign> = {}) {
    if (!requireSellerAccess() || !currentUser) return;

    const now = new Date().toISOString();
    const config = getDefaultRewardCampaignConfig(type);
    const campaign: SellerRewardCampaign = {
      kind: 'seller_reward_campaign',
      id: `campaign-${Date.now()}`,
      title: config.title,
      description: config.description,
      rewardCredits: config.rewardCredits,
      budgetCredits: config.budgetCredits,
      ...overrides,
      type,
      sellerId: currentUser.id,
      spentCredits: 0,
      status: overrides.status ?? 'active',
      perUserLimit: Math.max(1, Math.trunc(Number(overrides.perUserLimit ?? 1))),
      createdAt: now,
      updatedAt: now,
    };

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const saved = await repositories.sellerRewardCampaigns.saveCampaign(campaign);
      setSellerRewardCampaigns((current) => mergeById([saved], current));
      setSyncStatus('synced');
      logEvent('seller_reward_campaign_created', {
        campaignId: saved.id,
        type: saved.type,
        rewardCredits: saved.rewardCredits,
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Jeton kampanyası oluşturulamadı: ${getErrorMessage(error)}`);
    }
  }

  async function archiveSellerRewardCampaign(campaignId: string) {
    if (!requireSellerAccess() || !currentUser) return;

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.sellerRewardCampaigns.archiveCampaign(currentUser.id, campaignId);
      setSellerRewardCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === campaignId
            ? { ...campaign, status: 'archived', updatedAt: new Date().toISOString() }
            : campaign,
        ),
      );
      setSyncStatus('synced');
      logEvent('seller_reward_campaign_archived', { campaignId });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Jeton kampanyası arşivlenemedi: ${getErrorMessage(error)}`);
    }
  }

  function updateSellerStore(store: Partial<SellerStore>) {
    if (!requireSellerAccess()) return;

    const updatedAt = new Date().toISOString();
    const nextStore = {
      ...sellerStore,
      ...store,
      sellerId: currentUser?.id ?? sellerStore.sellerId,
      updatedAt,
    };
    setSellerStore(nextStore);
    setSellerStoresById((current) => ({
      ...current,
      [nextStore.sellerId]: nextStore,
    }));
    void repositories.sellerStores.saveStore(nextStore).catch((error) => {
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
    });
  }

  async function loadSellerStoreById(sellerId: string) {
    if (!sellerId) return undefined;

    const cached = sellerStoresById[sellerId];
    if (cached) return cached;

    if (sellerStore.sellerId === sellerId) {
      setSellerStoresById((current) => ({ ...current, [sellerId]: sellerStore }));
      return sellerStore;
    }

    try {
      const remoteStore = await repositories.sellerStores.getStore(sellerId);
      if (remoteStore) {
        setSellerStoresById((current) => ({ ...current, [sellerId]: remoteStore }));
      }
      return remoteStore;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
      return undefined;
    }
  }

  async function updateSellerOrderStatus(orderId: string, status: SellerOrderStatus) {
    if (!requireSellerAccess()) return;

    const updatedAt = new Date().toISOString();
    const order = sellerOrders.find((item) => item.id === orderId);
    if (!order) return;

    const nextStatusHistory = appendStatusHistory(order.statusHistory, status, updatedAt);
    const nextOrder = { ...order, status, updatedAt, statusHistory: nextStatusHistory };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.sellerOrders.updateOrder(order.sellerId, orderId, {
        status,
        updatedAt,
        statusHistory: nextStatusHistory,
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Sipariş durumu güncellenemedi: ${getErrorMessage(error)}`);
      return;
    }

    setSellerOrders((current) => current.map((item) => (item.id === orderId ? nextOrder : item)));
    setBuyerSellerOrders((current) => current.map((item) => (item.id === orderId ? nextOrder : item)));
    setOrders((current) =>
      current.map((item) =>
        item.id === order.buyerOrderId
          ? { ...item, statusSummary: buildOrderStatusSummary(mergeSellerOrders(getSellerOrdersForBuyerOrder(item.id), [nextOrder])) }
          : item,
      ),
    );
    setSyncStatus('synced');
    logEvent('seller_order_status_updated', { orderId, status });
  }

  async function updateSellerOrderFulfillment(orderId: string, patch: Pick<SellerOrder, 'carrierLabel' | 'trackingNumber'>) {
    if (!requireSellerAccess()) return;

    const order = sellerOrders.find((item) => item.id === orderId);
    if (!order) return;

    const updatedAt = new Date().toISOString();
    const nextOrder = { ...order, ...patch, updatedAt };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.sellerOrders.updateOrder(order.sellerId, orderId, {
        ...patch,
        updatedAt,
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Kargo bilgisi güncellenemedi: ${getErrorMessage(error)}`);
      return;
    }

    setSellerOrders((current) => current.map((item) => (item.id === orderId ? nextOrder : item)));
    setBuyerSellerOrders((current) => current.map((item) => (item.id === orderId ? nextOrder : item)));
    setSyncStatus('synced');
    logEvent('seller_tracking_updated', {
      orderId,
      carrierLabel: patch.carrierLabel ?? '',
      hasTrackingNumber: Boolean(patch.trackingNumber),
    });
  }

  async function updateProductStatus(
    productId: string,
    status: SellerProductStatus,
    eventName: Extract<AnalyticsEventName, 'seller_product_archived' | 'seller_product_activated'>,
  ) {
    if (!requireSellerAccess()) return;
    const existingProduct = sellerProducts.find((product) => product.id === productId);
    if (!existingProduct) return;

    const patch = { status, updatedAt: new Date().toISOString() };
    const nextProduct = { ...existingProduct, ...patch };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.products.updateStatus(productId, status);
      setSellerProducts((current) => upsertProductInList(current, nextProduct));
      setCatalog((current) => upsertProductInCatalog(current, nextProduct));
      setSyncStatus('synced');
      logEvent(eventName, { productId });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Ürün durumu güncellenemedi: ${getErrorMessage(error)}`);
    }
  }

  function addProductReview(review: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) {
    const nextReview: ProductReview = {
      ...review,
      id: `review-${Date.now()}`,
      userId: currentUser?.id ?? 'demo-local-user',
      createdAt: new Date().toISOString(),
    };
    setProductReviews((current) => [nextReview, ...current]);
    void repositories.reviews.addReview(nextReview).catch(() => {
      setSyncStatus('error');
      setSyncError('Review local olarak eklendi; Firebase yazımı başarısız oldu.');
    });
    logEvent('product_review_added', { productId: review.productId, rating: review.rating });
  }

  async function submitProductReviewWithReward(review: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) {
    if (!currentUser || currentUser.role !== 'buyer') {
      setSyncStatus('error');
      setSyncError('Yorum göndermek için müşteri hesabıyla giriş yapmalısın.');
      return;
    }

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const result = await repositories.buyerCredits.submitProductReview(currentUser.id, review);
      setProductReviews((current) => mergeById([result.review], current));
      setFitFeedback((current) => mergeById([result.fitFeedback], current));
      setBuyerCreditAccount(result.buyerCredits);
      await refreshBuyerCreditCenter();
      setSyncStatus('synced');
      logEvent('product_review_added', {
        productId: review.productId,
        rating: review.rating,
        rewardGranted: Boolean(result.reward),
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Yorum gönderilemedi: ${getErrorMessage(error)}`);
    }
  }

  async function submitFitFeedbackWithReward(feedback: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) {
    if (!currentUser || currentUser.role !== 'buyer') {
      setSyncStatus('error');
      setSyncError('Fit bilgisi paylaşmak için müşteri hesabıyla giriş yapmalısın.');
      return;
    }

    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const result = await repositories.buyerCredits.submitFitFeedback(currentUser.id, feedback);
      setFitFeedback((current) => mergeById([result.fitFeedback], current));
      setBuyerCreditAccount(result.buyerCredits);
      await refreshBuyerCreditCenter();
      setSyncStatus('synced');
      logEvent('fit_feedback_added', {
        productId: feedback.productId,
        result: feedback.result,
        rewardGranted: Boolean(result.reward),
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`Fit bilgisi gönderilemedi: ${getErrorMessage(error)}`);
    }
  }

  function addFitFeedback(feedback: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) {
    const nextFeedback: FitFeedback = {
      ...feedback,
      id: `fit-${Date.now()}`,
      userId: currentUser?.id ?? 'demo-local-user',
      createdAt: new Date().toISOString(),
    };
    setFitFeedback((current) => [nextFeedback, ...current]);
    void repositories.fitFeedback.addFeedback(nextFeedback).catch(() => {
      setSyncStatus('error');
      setSyncError('Fit feedback local olarak eklendi; Firebase yazımı başarısız oldu.');
    });
    logEvent('fit_feedback_added', { productId: feedback.productId, result: feedback.result });
  }

  function getProductReviews(productId: string) {
    return productReviews.filter((review) => review.productId === productId);
  }

  function getProductFitFeedback(productId: string) {
    return fitFeedback.filter((feedback) => feedback.productId === productId);
  }

  async function loadProductEngagement(productId: string) {
    if (engagementLoadingProductIds.includes(productId)) return;

    setEngagementLoadingProductIds((current) => mergeUniqueStrings(current, [productId]));
    try {
      const [remoteReviews, remoteFeedback] = await Promise.all([
        repositories.reviews.listReviews(productId),
        repositories.fitFeedback.listFeedback(productId),
      ]);
      setProductReviews((current) => mergeById(current, remoteReviews));
      setFitFeedback((current) => mergeById(current, remoteFeedback));
    } catch (error) {
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
    } finally {
      setEngagementLoadingProductIds((current) => current.filter((id) => id !== productId));
    }
  }

  function isProductEngagementLoading(productId: string) {
    return engagementLoadingProductIds.includes(productId);
  }

  function getSellerOrdersForBuyerOrder(orderId: string) {
    const allSellerOrders = mergeSellerOrders(buyerSellerOrders, sellerOrders);
    return allSellerOrders.filter((order) => order.buyerOrderId === orderId);
  }

  async function loadBuyerSellerOrders() {
    if (!currentUser || currentUser.role !== 'buyer') {
      return buyerSellerOrders;
    }

    try {
      const remoteOrders = await repositories.sellerOrders.listBuyerOrders(currentUser.id);
      const mergedOrders = mergeSellerOrders(
        sellerOrders.filter((order) => order.buyerId === currentUser.id),
        remoteOrders,
      );
      setBuyerSellerOrders(mergedOrders);
      setOrders((current) =>
        current.map((order) => ({
          ...order,
          statusSummary: buildOrderStatusSummary(mergedOrders.filter((sellerOrder) => sellerOrder.buyerOrderId === order.id)),
        })),
      );
      return mergedOrders;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(getErrorMessage(error));
      return buyerSellerOrders;
    }
  }

  async function submitReturnRequest(request: {
    buyerOrderId: string;
    productId: string;
    size: string;
    quantity: number;
    reason: string;
    note?: string;
    imageUri?: string;
  }) {
    if (!currentUser) {
      setSyncStatus('error');
      setSyncError('İade talebi için giriş yapılmalı.');
      return;
    }

    const sellerOrder = getSellerOrdersForBuyerOrder(request.buyerOrderId).find((order) =>
      order.items.some((item) => item.productId === request.productId && item.size === request.size),
    );
    const sellerItem = sellerOrder?.items.find((item) => item.productId === request.productId && item.size === request.size);
    if (!sellerOrder || !sellerItem) {
      setSyncStatus('error');
      setSyncError('Bu ürün için satıcı sipariş kaydı bulunamadı.');
      return;
    }

    const now = new Date().toISOString();
    const nextRequest: ReturnRequest = {
      id: `return-${Date.now()}`,
      buyerId: currentUser.id,
      buyerEmail: currentUser.email,
      buyerOrderId: request.buyerOrderId,
      sellerId: sellerOrder.sellerId,
      sellerOrderId: sellerOrder.id,
      productId: request.productId,
      productTitle: sellerItem.title,
      productImageUrl: sellerItem.imageUrl,
      size: request.size,
      quantity: request.quantity,
      reason: request.reason.trim(),
      note: request.note?.trim(),
      imageUri: request.imageUri,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      await repositories.returnRequests.createRequest(currentUser.id, nextRequest);
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`İade talebi oluşturulamadı: ${getErrorMessage(error)}`);
      return;
    }

    setReturnRequests((current) => [nextRequest, ...current]);
    setSyncStatus('synced');
    logEvent('return_request_submitted', {
      buyerOrderId: request.buyerOrderId,
      sellerOrderId: sellerOrder.id,
      productId: request.productId,
    });
  }

  async function updateReturnRequestStatus(requestId: string, status: ReturnRequestStatus, decisionNote?: string) {
    if (!requireSellerAccess()) return;

    const request = returnRequests.find((item) => item.id === requestId);
    if (!request) return;

    const updatedAt = new Date().toISOString();
    const nextRequest = {
      ...request,
      status,
      decisionNote: decisionNote?.trim() || request.decisionNote,
      updatedAt,
    };
    try {
      setSyncStatus('loading');
      setSyncError(undefined);
      const returnPatch: Partial<ReturnRequest> = { updatedAt };
      if (nextRequest.decisionNote) returnPatch.decisionNote = nextRequest.decisionNote;
      await repositories.returnRequests.updateRequestStatus(request.buyerId, requestId, status, {
        ...returnPatch,
      });
    } catch (error) {
      setSyncStatus('error');
      setSyncError(`İade durumu güncellenemedi: ${getErrorMessage(error)}`);
      return;
    }

    setReturnRequests((current) => current.map((item) => (item.id === requestId ? nextRequest : item)));
    setSyncStatus('synced');
    logEvent('seller_return_status_updated', { requestId, status });
  }

  function getReturnRequestsForBuyerOrder(orderId: string) {
    return returnRequests.filter((request) => request.buyerOrderId === orderId);
  }

  function getReturnRequestsForSellerOrder(sellerOrderId: string) {
    return returnRequests.filter((request) => request.sellerOrderId === sellerOrderId);
  }

  const value = {
    repositoryMode: repositories.mode,
    currentUser,
    authError,
    authLoading,
    syncStatus,
    syncError,
    profile,
    catalog,
    recommendations,
    intent,
    chatMessages,
    chatConversations,
    activeChatConversationId,
    selectedProduct,
    selectedOutfit,
    cartItems,
    favoriteProductIds,
    recentSearches,
    currentCatalogSearchContext,
    currentChatSearchContext,
    addressBook,
    paymentMethods,
    deliveryOptions,
    comparisonRows,
    sellerDraft,
    sellerCreditAccount,
    sellerCreditLoading,
    sellerCreditPurchaseStatus,
    sellerCreditPurchaseError,
    buyerCreditAccount,
    buyerCreditCenter,
    buyerCreditLoading,
    tryOnCreditCost: getTryOnCreditCost(),
    generatedListing,
    aiGenerationStatus,
    aiGenerationError,
    lastAIReasoning,
    productImageEnhancementStatus,
    productImageEnhancementError,
    productImageEnhancementPreview,
    selectedProductImageEnhancementMode,
    publishedListings,
    sellerProducts,
    sellerRewardCampaigns,
    sellerStore,
    sellerStoresById,
    sellerOrders,
    buyerSellerOrders,
    orders,
    returnRequests,
    productReviews,
    fitFeedback,
    analyticsEvents,
    checkoutDetails,
    userSettings,
    tryOnState,
    tryOnGenerationStatus,
    tryOnGenerationError,
    tryOnPreview,
    tryOnHistory,
    isPurchaseCompleted,
    cartTotal,
    canManageSeller: canManageSellerValue,
    signUp,
    signIn,
    signOut,
    updateProfile,
    completeOnboardingSetup,
    submitChatPrompt,
    startNewChat,
    openChatConversation,
    selectProduct,
    addToCart,
    addOutfitToCart,
    incrementCartItem,
    decrementCartItem,
    removeCartItem,
    updateCartItemSize,
    clearCart,
    completePurchase,
    updateCheckoutDetails,
    updateNotificationSettings,
    updatePrivacySettings,
    getCheckoutValidationErrors,
    saveAddress,
    removeAddress,
    savePaymentMethod,
    removePaymentMethod,
    saveRecentSearch,
    clearRecentSearches,
    setCatalogSearchContext,
    toggleFavorite,
    isFavorite,
    askWhy,
    requestCheaper,
    requestChatFollowUp,
    requestSameSeller,
    requestSimilarBudget,
    requestSimilarProducts,
    createOutfit,
    compareTopProducts,
    updateTryOnState,
    generateTryOnPreview,
    restoreTryOnPreview,
    recordTryOnToCheckout,
    refreshBuyerCredits,
    refreshBuyerCreditCenter,
    claimBuyerCampaignReward,
    getSponsoredTryOnTaskForProduct,
    updateSellerDraft,
    refreshSellerCredits,
    purchaseSellerCreditPackage,
    setProductImageEnhancementMode,
    enhanceSellerProductImage,
    acceptEnhancedProductImage,
    discardEnhancedProductImage,
    generateSellerListing,
    regenerateSellerListing,
    updateGeneratedListing,
    publishListing,
    updateSellerProduct,
    updateSellerProductSizeChart,
    archiveSellerProduct,
    activateSellerProduct,
    deleteSellerProduct,
    createSellerRewardCampaign,
    archiveSellerRewardCampaign,
    updateSellerStore,
    loadSellerStoreById,
    updateSellerOrderStatus,
    getSellerOrdersForBuyerOrder,
    loadBuyerSellerOrders,
    submitReturnRequest,
    updateReturnRequestStatus,
    getReturnRequestsForBuyerOrder,
    getReturnRequestsForSellerOrder,
    updateSellerOrderFulfillment,
    addProductReview,
    submitProductReviewWithReward,
    submitFitFeedbackWithReward,
    addFitFeedback,
    getProductReviews,
    getProductFitFeedback,
    loadProductEngagement,
    isProductEngagementLoading,
    logEvent,
    getAuthToken,
    recordSearchAnalytics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppProvider');
  }

  return context;
}

function upsertCartItem(
  items: CartItem[],
  productId: string,
  size: string,
  searchAttribution?: Partial<
    Pick<CartItem, 'searchEngineSource' | 'searchId' | 'searchMode' | 'searchQuery' | 'searchSurface'>
  >,
) {
  const exists = items.find((item) => item.productId === productId && item.size === size);
  if (exists) {
    return items.map((item) =>
      item.productId === productId && item.size === size
        ? { ...item, quantity: item.quantity + 1, ...searchAttribution }
        : item,
    );
  }

  return [...items, { productId, size, quantity: 1, ...searchAttribution }];
}

function mergeCartItems(localItems: CartItem[], remoteItems: CartItem[]) {
  const itemMap = new Map<string, CartItem>();
  [...localItems, ...remoteItems].forEach((item) => {
    const key = `${item.productId}:${item.size}`;
    const existing = itemMap.get(key);
    itemMap.set(key, {
      ...item,
      quantity: existing ? mergeQuantity(existing.quantity, item.quantity) : item.quantity,
    });
  });
  return Array.from(itemMap.values());
}

function mergeQuantity(localQuantity: number, remoteQuantity: number) {
  return localQuantity === remoteQuantity ? localQuantity : localQuantity + remoteQuantity;
}

function mergeUniqueStrings(localItems: string[], remoteItems: string[]) {
  return Array.from(new Set([...localItems, ...remoteItems]));
}

function mergeRecentSearches(localItems: RecentSearchEntry[], remoteItems: RecentSearchEntry[]) {
  const entryMap = new Map<string, RecentSearchEntry>();
  [...remoteItems, ...localItems].forEach((entry) => {
    const key = entry.query.trim().toLocaleLowerCase('tr-TR');
    const existing = entryMap.get(key);
    if (!existing || entry.createdAt > existing.createdAt) {
      entryMap.set(key, entry);
    }
  });
  return Array.from(entryMap.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
}

function mergeOrders(localOrders: Order[], remoteOrders: Order[]) {
  const orderMap = new Map<string, Order>();
  [...localOrders, ...remoteOrders].forEach((order) => {
    orderMap.set(order.id, order);
  });
  return Array.from(orderMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeSellerOrders(localOrders: SellerOrder[], remoteOrders: SellerOrder[]) {
  const orderMap = new Map<string, SellerOrder>();
  [...localOrders, ...remoteOrders].forEach((order) => {
    orderMap.set(order.id, order);
  });
  return Array.from(orderMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function sanitizeSellerDraftRecord(record: SellerDraftRecord): SellerDraftRecord {
  if (isLegacyDemoSellerDraft(record.draft)) {
    return {
      draft: createDefaultSellerDraft(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  return record;
}

function pickNewestDraft(localRecord: SellerDraftRecord, remoteRecord?: SellerDraftRecord) {
  if (!remoteRecord) return localRecord;

  const localHasContent = hasSellerDraftContent(localRecord);
  const remoteHasContent = hasSellerDraftContent(remoteRecord);
  const localTime = Date.parse(localRecord.updatedAt) || 0;
  const remoteTime = Date.parse(remoteRecord.updatedAt) || 0;
  if (!localHasContent && remoteHasContent) return localTime > remoteTime ? localRecord : remoteRecord;
  if (localHasContent && !remoteHasContent) return remoteTime > localTime ? remoteRecord : localRecord;

  return remoteTime > localTime ? remoteRecord : localRecord;
}

function hasSellerDraftContent(record: SellerDraftRecord) {
  return Boolean(
    record.generatedListing ||
      record.draft.imageUrl.trim() ||
      record.draft.price.trim() ||
      record.draft.stock.trim() ||
      record.draft.sizes.trim() ||
      record.draft.optionalName.trim() ||
      record.draft.optionalCategory.trim(),
  );
}

function isLegacyDemoSellerDraft(draft: SellerDraft) {
  return (
    draft.imageUrl === products[0].imageUrl &&
    draft.price === '2299' &&
    draft.stock === '18' &&
    draft.sizes.replace(/\s/g, '') === 'S,M,L' &&
    !draft.optionalName.trim() &&
    draft.optionalCategory === 'Elbise'
  );
}

function mergeById<T extends { id: string }>(localItems: T[], remoteItems: T[]) {
  const itemMap = new Map<string, T>();
  [...localItems, ...remoteItems].forEach((item) => {
    itemMap.set(item.id, item);
  });
  return Array.from(itemMap.values());
}

function normalizeCheckoutDetails(
  details?: Partial<CheckoutDetails> & { shippingMethodId?: string },
): CheckoutDetails {
  if (!details) return defaultCheckoutDetails;
  return {
    addressId: details.addressId || defaultCheckoutDetails.addressId,
    paymentMethodId: details.paymentMethodId || defaultCheckoutDetails.paymentMethodId,
    deliveryOptionId: details.deliveryOptionId || details.shippingMethodId || defaultCheckoutDetails.deliveryOptionId,
    note: details.note ?? '',
  };
}

function normalizeUserSettings(settings?: Partial<UserSettings>): UserSettings {
  return {
    notifications: {
      ...defaultUserSettings.notifications,
      ...settings?.notifications,
    },
    privacy: {
      ...defaultUserSettings.privacy,
      ...settings?.privacy,
    },
    updatedAt: settings?.updatedAt ?? new Date().toISOString(),
  };
}

function upsertEntity<T extends { id: string }>(items: T[], nextItem: T) {
  const exists = items.some((item) => item.id === nextItem.id);
  if (!exists) {
    return normalizeDefaultEntity([...items, nextItem]);
  }
  return normalizeDefaultEntity(items.map((item) => (item.id === nextItem.id ? nextItem : item)));
}

function normalizeDefaultEntity<T extends { id: string; isDefault?: boolean }>(items: T[]) {
  const defaultId = [...items].reverse().find((item) => item.isDefault)?.id ?? items[0]?.id;
  return items.map((item) => ({ ...item, isDefault: item.id === defaultId }));
}

function getAddressLabel(id: string, addressBook: AddressBookEntry[]) {
  const address = addressBook.find((item) => item.id === id) ?? addressBook[0];
  return address ? `${address.label} · ${address.city}` : 'Adres belirtilmedi';
}

function getPaymentLabel(id: string, paymentMethods: SavedPaymentMethod[]) {
  const paymentMethod = paymentMethods.find((item) => item.id === id) ?? paymentMethods[0];
  if (!paymentMethod) return 'Ödeme belirtilmedi';
  if (paymentMethod.type === 'wallet') return paymentMethod.label;
  if (paymentMethod.type === 'cash') return `${paymentMethod.label} · Kapıda ödeme`;
  return `${paymentMethod.brand} •••• ${paymentMethod.last4}`;
}

function createChatConversationId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChatConversationSnapshot({
  id,
  messages,
  recommendations,
  comparisonRows,
  selectedOutfit,
  selectedProductId,
  currentChatSearchContext,
}: {
  id: string;
  messages: ChatMessage[];
  recommendations: RecommendationResult[];
  comparisonRows: ComparisonRow[];
  selectedOutfit: Outfit;
  selectedProductId?: string;
  currentChatSearchContext?: SearchContext;
}): ChatConversation {
  const now = new Date().toISOString();

  return {
    id,
    title: deriveChatConversationTitle(messages),
    messages,
    recommendations,
    comparisonRows,
    selectedOutfit,
    selectedProductId,
    currentChatSearchContext,
    createdAt: messages[0]?.createdAt ?? now,
    updatedAt: messages[messages.length - 1]?.createdAt ?? now,
  };
}

function deriveChatConversationTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.text;
  const fallback = firstUserMessage ?? messages.find((message) => message.role === 'assistant')?.text ?? 'Yeni sohbet';
  return fallback.length > 48 ? `${fallback.slice(0, 45).trim()}...` : fallback;
}

function upsertChatConversation(conversations: ChatConversation[], snapshot: ChatConversation) {
  const current = conversations.find((conversation) => conversation.id === snapshot.id);
  const next = current
    ? conversations.map((conversation) =>
        conversation.id === snapshot.id
          ? {
              ...snapshot,
              createdAt: current.createdAt,
              title: snapshot.messages.some((message) => message.role === 'user')
                ? snapshot.title
                : current.title === 'Yeni sohbet'
                  ? snapshot.title
                  : current.title,
            }
          : conversation,
      )
    : [snapshot, ...conversations];

  return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeRecentChatConversations(conversations: ChatConversation[]) {
  const cutoff = Date.now() - chatHistoryRetentionDays * 24 * 60 * 60 * 1000;

  return conversations
    .filter((conversation) => {
      const updatedAt = new Date(conversation.updatedAt).getTime();
      return Number.isFinite(updatedAt) && updatedAt >= cutoff;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function userMessage(text: string): ChatMessage {
  return {
    id: `${Date.now()}-user-${Math.random()}`,
    role: 'user',
    text,
    createdAt: new Date().toISOString(),
  };
}

function assistantMessage(
  text: string,
  type: ChatMessage['type'] = 'text',
  suggestedActions?: SuggestedChatAction[],
): ChatMessage {
  return {
    id: `${Date.now()}-assistant-${Math.random()}`,
    role: 'assistant',
    text,
    type,
    suggestedActions,
    createdAt: new Date().toISOString(),
  };
}

function buildSuggestedActions(currentMode: ChatFollowUpMode = 'default'): SuggestedChatAction[] {
  const all: SuggestedChatAction[] = [
    { mode: 'same_seller', label: 'Aynı mağaza' },
    { mode: 'similar_budget', label: 'Benzer bütçe' },
    { mode: 'similar_products', label: 'Benzer ürün' },
    { mode: 'dressier', label: 'Daha şık' },
    { mode: 'simpler', label: 'Daha sade' },
    { mode: 'more_casual', label: 'Daha günlük' },
  ];
  return all.filter((item) => item.mode !== currentMode);
}

function buildFollowUpPrompt(product: Product, mode: ChatFollowUpMode) {
  if (mode === 'same_seller') {
    return `${product.seller} mağazasından benzer ürünler göster.`;
  }
  if (mode === 'similar_budget') {
    return `${product.title} ile benzer bütçede alternatif göster.`;
  }
  if (mode === 'similar_products') {
    return `${product.title} ürününe benzer ürünler göster.`;
  }
  if (mode === 'dressier') {
    return `${product.title} için daha şık alternatifler göster.`;
  }
  if (mode === 'simpler') {
    return `${product.title} için daha sade alternatifler göster.`;
  }
  if (mode === 'more_casual') {
    return `${product.title} için daha günlük alternatifler göster.`;
  }
  return `${product.title} için alternatif göster.`;
}

function extractCartSearchAttribution(
  metadata?: AnalyticsEvent['metadata'],
): Partial<Pick<CartItem, 'searchEngineSource' | 'searchId' | 'searchMode' | 'searchQuery' | 'searchSurface'>> | undefined {
  if (!metadata || typeof metadata.searchId !== 'string') {
    return undefined;
  }

  const searchSurface: CartItem['searchSurface'] =
    metadata.source === 'catalog' || metadata.source === 'chat' ? metadata.source : undefined;
  const searchEngineSource =
    metadata.searchSource === 'internal' || metadata.searchSource === 'local'
      ? metadata.searchSource
      : undefined;
  return {
    searchId: metadata.searchId,
    searchQuery: typeof metadata.query === 'string' ? metadata.query : undefined,
    searchSurface,
    searchMode: typeof metadata.mode === 'string' ? (metadata.mode as ChatFollowUpMode) : undefined,
    searchEngineSource: searchEngineSource as CartItem['searchEngineSource'],
  };
}

function sanitizeMetadata(metadata: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value !== 'undefined')) as Record<
    string,
    string | number | boolean
  >;
}

function getBaseCatalogForRepositoryMode() {
  return repositories.mode === 'firebase' ? [] : products;
}

function getActiveCatalog(catalog: Product[]) {
  return catalog.filter((product) => (product.status ?? 'active') !== 'archived');
}

function upsertProductInList(items: Product[], nextProduct: Product) {
  const exists = items.some((product) => product.id === nextProduct.id);
  if (!exists) return [nextProduct, ...items];
  return items.map((product) => (product.id === nextProduct.id ? nextProduct : product));
}

function upsertProductInCatalog(items: Product[], nextProduct: Product) {
  if ((nextProduct.status ?? 'active') !== 'active') {
    return items.filter((product) => product.id !== nextProduct.id);
  }
  return upsertProductInList(items, nextProduct);
}

function sanitizeSellerProductPatch(patch: Partial<Product>) {
  const { id: _id, sellerId: _sellerId, createdAt: _createdAt, source: _source, ...safePatch } = patch;
  return safePatch;
}

function isRemoteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function createDefaultSellerStore(
  sellerId = 'demo-seller',
  email = 'seller@chat2shop.dev',
): SellerStore {
  const now = new Date().toISOString();
  return {
    sellerId,
    name: 'Chat2Shop Studio',
    description: 'AI destekli alışveriş deneyimine hazır modern moda mağazası.',
    contact: email,
    shippingTime: '2-4 iş günü',
    returnPolicy: '14 gün içinde iade kabul edilir.',
    supportEmail: email,
    supportPhone: '+90 555 000 00 00',
    faq: 'Siparişler 24 saat içinde hazırlanır. İade talepleri uygulama içinden açılır.',
    rating: 4.8,
    badges: ['AI-ready catalog', 'Fast shipping'],
    trustBadges: ['Güvenilir satıcı', 'Kolay iade', 'Hızlı destek'],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSellerStore(store: SellerStore, sellerId: string, email: string) {
  const now = new Date().toISOString();
  return {
    ...store,
    sellerId,
    contact: store.contact || email,
    supportEmail: store.supportEmail || email,
    supportPhone: store.supportPhone || '+90 555 000 00 00',
    faq: store.faq || 'Siparişler 24 saat içinde hazırlanır. İade talepleri uygulama içinden açılır.',
    trustBadges: store.trustBadges?.length ? store.trustBadges : ['Güvenilir satıcı', 'Kolay iade', 'Hızlı destek'],
    createdAt: store.createdAt || now,
    updatedAt: store.updatedAt || now,
  };
}

function buildSellerOrdersFromCart(
  order: Order,
  catalog: Product[],
  buyer?: AppUser,
) {
  const grouped = new Map<string, SellerOrderItem[]>();

  order.items.forEach((cartItem) => {
    const product = catalog.find((item) => item.id === cartItem.productId);
    if (!product?.sellerId) return;

    const item: SellerOrderItem = {
      productId: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      size: cartItem.size,
      color: product.color,
      quantity: cartItem.quantity,
      unitPrice: product.price,
      total: product.price * cartItem.quantity,
    };
    grouped.set(product.sellerId, [...(grouped.get(product.sellerId) ?? []), item]);
  });

  return Array.from(grouped.entries()).map(([sellerId, items]) => {
    const subtotal = items.reduce((total, item) => total + item.total, 0);
    const sellerShipping = grouped.size > 0 ? Math.round(order.shipping / grouped.size) : 0;
    const now = new Date().toISOString();
    const statusHistory = appendStatusHistory([], 'new', now);

    return {
      id: `${order.id}-${sellerId}`,
      sellerId,
      buyerId: buyer?.id,
      buyerEmail: buyer?.email,
      buyerOrderId: order.id,
      items,
      subtotal,
      shipping: sellerShipping,
      total: subtotal + sellerShipping,
      status: 'new' as const,
      addressLabel: order.addressLabel,
      paymentLabel: order.paymentLabel,
      deliveryLabel: order.deliveryLabel,
      deliveryEta: order.deliveryEta,
      note: order.note,
      statusHistory,
      createdAt: order.createdAt,
      updatedAt: now,
    };
  });
}

function createDemoBuyerOrderSeed({
  addressBook,
  catalog,
  deliveryOptions,
  paymentMethods,
  user,
}: {
  addressBook: AddressBookEntry[];
  catalog: Product[];
  deliveryOptions: DeliveryOption[];
  paymentMethods: SavedPaymentMethod[];
  user: AppUser;
}): { order: Order; sellerOrder: SellerOrder } | undefined {
  if (user.role !== 'buyer' || user.email.toLocaleLowerCase('tr-TR') !== demoBuyerEmail) return undefined;

  const product = catalog.find((item) => item.id === 'blue-summer-midi');
  if (!product) return undefined;

  const createdAt = '2026-05-15T09:20:00.000Z';
  const shippedAt = '2026-05-15T14:35:00.000Z';
  const deliveryOption = deliveryOptions[0];
  const sellerId = product.sellerId ?? 'demo-seller-azure-lane';
  const cartItem: CartItem = {
    productId: product.id,
    size: product.sizes.includes('M') ? 'M' : product.sizes[0],
    quantity: 1,
  };
  const sellerOrderItem: SellerOrderItem = {
    productId: product.id,
    title: product.title,
    imageUrl: product.imageUrl,
    size: cartItem.size,
    color: product.color,
    quantity: cartItem.quantity,
    unitPrice: product.price,
    total: product.price * cartItem.quantity,
  };
  const sellerOrderId = `${demoBlueSummerOrderId}-${sellerId}`;
  const sellerOrder: SellerOrder = {
    id: sellerOrderId,
    sellerId,
    buyerId: user.id,
    buyerEmail: user.email,
    buyerOrderId: demoBlueSummerOrderId,
    items: [sellerOrderItem],
    subtotal: sellerOrderItem.total,
    shipping: deliveryOption.price,
    total: sellerOrderItem.total + deliveryOption.price,
    status: 'shipped',
    addressLabel: getAddressLabel(addressBook[0]?.id ?? defaultAddressBook[0].id, addressBook),
    paymentLabel: getPaymentLabel(paymentMethods[0]?.id ?? defaultPaymentMethods[0].id, paymentMethods),
    deliveryLabel: deliveryOption.label,
    deliveryEta: deliveryOption.eta,
    carrierLabel: 'Yurtiçi Kargo',
    trackingNumber: 'C2S-BLUE-4587',
    statusHistory: appendStatusHistory(appendStatusHistory([], 'new', createdAt), 'shipped', shippedAt),
    createdAt,
    updatedAt: shippedAt,
  };
  const order: Order = {
    id: demoBlueSummerOrderId,
    items: [cartItem],
    subtotal: sellerOrder.subtotal,
    shipping: sellerOrder.shipping,
    total: sellerOrder.total,
    addressLabel: sellerOrder.addressLabel,
    paymentLabel: sellerOrder.paymentLabel,
    deliveryOptionId: deliveryOption.id,
    deliveryLabel: deliveryOption.label,
    deliveryEta: deliveryOption.eta,
    statusSummary: buildOrderStatusSummary([sellerOrder]),
    sellerOrderIds: [sellerOrder.id],
    createdAt,
  };

  return { order, sellerOrder };
}

function createDefaultAddresses(): AddressBookEntry[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'home',
      label: 'Ev',
      recipient: 'Orhun Karaduman',
      phone: '+90 555 111 11 11',
      line1: 'Moda Caddesi 10',
      city: 'Istanbul',
      district: 'Kadikoy',
      note: 'Kapıya bırakılabilir.',
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'office',
      label: 'Ofis',
      recipient: 'Orhun Karaduman',
      phone: '+90 555 111 11 11',
      line1: 'Levent Plaza 4',
      city: 'Istanbul',
      district: 'Besiktas',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createDefaultPaymentMethods(): SavedPaymentMethod[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'mock-card',
      label: 'Kişisel kart',
      holderName: 'Orhun Karaduman',
      brand: 'Visa',
      last4: '4187',
      expiryMonth: '12',
      expiryYear: '28',
      type: 'card',
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wallet',
      label: 'Chat2Shop Wallet',
      holderName: 'Orhun Karaduman',
      brand: 'Wallet',
      last4: '0000',
      expiryMonth: '00',
      expiryYear: '00',
      type: 'wallet',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createDeliveryOptions(): DeliveryOption[] {
  return [
    { id: 'standard', label: 'Standart teslimat', description: '2-4 iş günü', eta: '2-4 iş günü', price: 50 },
    { id: 'express', label: 'Hızlı teslimat', description: 'Ertesi gün', eta: '1 iş günü', price: 120 },
    { id: 'pickup', label: 'Mağazadan teslim', description: 'Aynı gün teslim al', eta: 'Aynı gün', price: 0 },
  ];
}

function appendStatusHistory(
  history: SellerOrderTimelineItem[] | undefined,
  status: SellerOrderStatus,
  createdAt: string,
): SellerOrderTimelineItem[] {
  const current = history ?? [];
  if (current.some((item) => item.status === status)) {
    return current.map((item) =>
      item.status === status ? { ...item, createdAt } : item,
    );
  }
  return [
    ...current,
    {
      status,
      label: getSellerStatusLabel(status),
      description: getSellerStatusDescription(status),
      createdAt,
    },
  ];
}

function buildOrderStatusSummary(sellerOrders: SellerOrder[]): OrderStatusSummary {
  if (sellerOrders.length === 0) {
    return {
      status: 'mixed',
      label: 'Satıcı durumu bekleniyor',
      sellerOrderCount: 0,
      issueCount: 0,
      shippedCount: 0,
      completedCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const issueCount = sellerOrders.filter((order) => order.status === 'issue').length;
  const shippedCount = sellerOrders.filter((order) => order.status === 'shipped').length;
  const completedCount = sellerOrders.filter((order) => order.status === 'completed').length;
  const allSameStatus = sellerOrders.every((order) => order.status === sellerOrders[0].status);
  const status = allSameStatus ? sellerOrders[0].status : 'mixed';
  const updatedAt = sellerOrders
    .map((order) => order.updatedAt)
    .sort()
    .at(-1) ?? new Date().toISOString();

  return {
    status,
    label: getSummaryLabel({ sellerOrderCount: sellerOrders.length, issueCount, shippedCount, completedCount }),
    sellerOrderCount: sellerOrders.length,
    issueCount,
    shippedCount,
    completedCount,
    updatedAt,
  };
}

function getSummaryLabel(summary: Pick<OrderStatusSummary, 'sellerOrderCount' | 'issueCount' | 'shippedCount' | 'completedCount'>) {
  if (summary.issueCount > 0) return 'Aksiyon gereken sipariş var';
  if (summary.completedCount === summary.sellerOrderCount) return 'Tüm parçalar tamamlandı';
  if (summary.shippedCount === summary.sellerOrderCount) return 'Sipariş kargoya verildi';
  if (summary.shippedCount > 0) return 'Siparişin bir kısmı kargoda';
  return 'Satıcı siparişi hazırlıyor';
}

function getSellerStatusLabel(status: SellerOrderStatus) {
  if (status === 'new') return 'Yeni';
  if (status === 'preparing') return 'Hazırlanıyor';
  if (status === 'shipped') return 'Kargoda';
  if (status === 'completed') return 'Tamamlandı';
  return 'Sorunlu';
}

function getSellerStatusDescription(status: SellerOrderStatus) {
  if (status === 'new') return 'Sipariş satıcıya ulaştı.';
  if (status === 'preparing') return 'Satıcı ürünleri hazırlıyor.';
  if (status === 'shipped') return 'Sipariş kargoya verildi.';
  if (status === 'completed') return 'Teslimat tamamlandı.';
  return 'Satıcı aksiyonu gerekiyor.';
}

function mergeProducts(localProducts: Product[], repositoryProducts: Product[]) {
  const productMap = new Map<string, Product>();
  [...localProducts, ...repositoryProducts].forEach((product) => {
    productMap.set(product.id, product);
  });
  return Array.from(productMap.values());
}

function getTryOnModelUri(tryOnState: TryOnState, selectedProduct: Product) {
  if (tryOnState.mode === 'photo' && tryOnState.photoUri) return tryOnState.photoUri;
  if (tryOnState.mode === 'product') return selectedProduct.imageUrl;
  return tryOnState.avatarUri;
}

function getDefaultRewardCampaignConfig(type: SellerRewardCampaign['type']) {
  if (type === 'purchase_reward') {
    return {
      title: 'Alışverişe jeton ödülü',
      description: 'Mağazandan alışveriş yapan müşterilere sponsorlu jeton ver.',
      rewardCredits: 10,
      budgetCredits: 300,
    };
  }
  if (type === 'review_reward') {
    return {
      title: 'Yoruma jeton ödülü',
      description: 'Satın aldığı ürüne yorum yapan müşterilere jeton ver.',
      rewardCredits: 3,
      budgetCredits: 90,
    };
  }
  if (type === 'fit_feedback_reward') {
    return {
      title: 'Fit feedback ödülü',
      description: 'Beden duruşunu paylaşan müşterilere jeton ver.',
      rewardCredits: 2,
      budgetCredits: 80,
    };
  }
  if (type === 'sponsored_try_on') {
    return {
      title: 'Sponsorlu Kabin denemesi',
      description: 'Müşterilerin seçili ürünleri Kabin’de ücretsiz denemesini sağla.',
      rewardCredits: 2,
      budgetCredits: 120,
    };
  }
  return {
    title: 'Mağaza promosyon jetonu',
    description: 'Jeton Merkezi’nde müşterilerin alabileceği promosyon kampanyası.',
    rewardCredits: 5,
    budgetCredits: 100,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'İşlem tamamlanamadı.';
}

function getDailyChatLimitMessage() {
  return 'Bugünkü ücretsiz AI sohbet limitine ulaştın. Yarın tekrar devam edebilirsin.';
}
