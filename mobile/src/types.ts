export type StyleTag =
  | 'minimal'
  | 'elegant'
  | 'classic'
  | 'smart casual'
  | 'streetwear'
  | 'casual'
  | 'sporty'
  | 'modest'
  | 'bohemian'
  | 'vintage'
  | 'old money'
  | 'clean girl';

export type OccasionTag =
  | 'graduation'
  | 'evening'
  | 'wedding guest'
  | 'office'
  | 'daily'
  | 'holiday'
  | 'summer'
  | 'dinner'
  | 'sport'
  | 'weekend';

export type Category =
  | 'dress'
  | 'shirt'
  | 'pants'
  | 'jacket'
  | 'shoes'
  | 'bag'
  | 'accessory';

export type ModestyLevel = 'low' | 'medium' | 'medium-high' | 'high';

export type UserRole = 'buyer' | 'seller';

export type RepositoryMode = 'local' | 'firebase';

export type SyncStatus = 'idle' | 'loading' | 'synced' | 'error';

export type AIGenerationStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AISource = 'mock' | 'remote' | 'remote-fallback' | 'manual';

export type TryOnSource = AISource;

export type SellerProductStatus = 'draft' | 'active' | 'archived';

export type SellerOrderStatus = 'new' | 'preparing' | 'shipped' | 'completed' | 'issue';

export type ChatFollowUpMode =
  | 'default'
  | 'same_seller'
  | 'similar_budget'
  | 'similar_products'
  | 'dressier'
  | 'simpler'
  | 'more_casual';

export type AppUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type SizeChartRow = {
  size: string;
  chest?: string;
  waist?: string;
  hip?: string;
  length?: string;
};

export type SizeChart = SizeChartRow[];

export type Product = {
  id: string;
  title: string;
  seller: string;
  sellerId?: string;
  price: number;
  color: string;
  sizes: string[];
  stock: number;
  status?: SellerProductStatus;
  source?: 'mock' | 'local-seller' | 'firebase-seller';
  sizeChart?: SizeChart;
  createdAt?: string;
  updatedAt?: string;
  visibilityScore: number;
  imageUrl: string;
  category: Category;
  fit: string;
  modesty: ModestyLevel;
  season: string[];
  styleTags: StyleTag[];
  vibeTags: string[];
  occasionTags: OccasionTag[];
  aiSearchIntents: string[];
  description: string;
  sellerReliability: number;
};

export type Outfit = {
  id: string;
  title: string;
  occasion: string;
  totalPrice: number;
  productIds: string[];
  explanation: string;
};

export type StyleProfile = {
  audience: string;
  age?: string;
  size: string;
  height: string;
  budgetMax: number;
  styles: StyleTag[];
  occasions: string[];
  colors: string[];
  fitPreference: string;
};

export type UserIntent = {
  rawText: string;
  category?: Category;
  occasion?: OccasionTag;
  color?: string;
  styles: StyleTag[];
  budgetMax?: number;
  modesty?: 'not too revealing' | 'balanced' | 'bold';
  size?: string;
  fitPreference?: string;
};

export type RecommendationResult = {
  product: Product;
  matchScore: number;
  reason: string;
  highlights: string[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
  type?: 'text' | 'recommendations' | 'outfit' | 'comparison';
  suggestedActions?: SuggestedChatAction[];
};

export type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  recommendations: RecommendationResult[];
  comparisonRows: ComparisonRow[];
  selectedOutfit: Outfit;
  selectedProductId?: string;
  currentChatSearchContext?: SearchContext;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: string;
  size: string;
  quantity: number;
  searchId?: string;
  searchQuery?: string;
  searchSurface?: 'catalog' | 'chat';
  searchMode?: ChatFollowUpMode;
  searchEngineSource?: 'internal' | 'local';
};

export type AddressBookEntry = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  note?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedPaymentMethod = {
  id: string;
  label: string;
  holderName: string;
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  type: 'card' | 'wallet' | 'cash';
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryOption = {
  id: string;
  label: string;
  description: string;
  eta: string;
  price: number;
};

export type CheckoutDetails = {
  addressId: string;
  paymentMethodId: string;
  deliveryOptionId: string;
  note?: string;
};

export type UserNotificationSettings = {
  orderUpdates: boolean;
  styleSuggestions: boolean;
  campaigns: boolean;
};

export type UserPrivacySettings = {
  personalizationEnabled: boolean;
  usageAnalyticsEnabled: boolean;
  tryOnHistoryEnabled: boolean;
};

export type UserSettings = {
  notifications: UserNotificationSettings;
  privacy: UserPrivacySettings;
  updatedAt: string;
};

export type OrderStatusSummary = {
  status: SellerOrderStatus | 'mixed';
  label: string;
  sellerOrderCount: number;
  issueCount: number;
  shippedCount: number;
  completedCount: number;
  updatedAt: string;
};

export type Order = {
  id: string;
  buyerId?: string;
  buyerEmail?: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  addressLabel: string;
  addressSnapshot?: AddressBookEntry;
  paymentLabel: string;
  paymentSnapshot?: SavedPaymentMethod;
  deliveryOptionId: string;
  deliveryLabel: string;
  deliveryEta: string;
  deliverySnapshot?: DeliveryOption;
  note?: string;
  statusSummary?: OrderStatusSummary;
  sellerOrderIds?: string[];
  createdAt: string;
  updatedAt?: string;
};

export type SellerStore = {
  sellerId: string;
  name: string;
  description: string;
  contact: string;
  shippingTime: string;
  returnPolicy: string;
  logoUrl?: string;
  coverUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  faq?: string;
  rating: number;
  badges: string[];
  trustBadges?: string[];
  createdAt: string;
  updatedAt: string;
};

export type SellerOrderTimelineItem = {
  status: SellerOrderStatus;
  label: string;
  description: string;
  createdAt: string;
};

export type SellerOrderItem = {
  productId: string;
  title: string;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type SellerOrder = {
  id: string;
  sellerId: string;
  buyerId?: string;
  buyerEmail?: string;
  buyerOrderId: string;
  items: SellerOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: SellerOrderStatus;
  addressLabel: string;
  paymentLabel: string;
  deliveryLabel?: string;
  deliveryEta?: string;
  carrierLabel?: string;
  trackingNumber?: string;
  note?: string;
  statusHistory?: SellerOrderTimelineItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReturnRequestStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'refunded-mock';

export type ReturnRequest = {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  buyerOrderId: string;
  sellerId: string;
  sellerOrderId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  size: string;
  quantity: number;
  reason: string;
  note?: string;
  imageUri?: string;
  status: ReturnRequestStatus;
  decisionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type BuyerOrderTimelineStatus =
  | 'placed'
  | SellerOrderStatus
  | 'return-requested'
  | 'return-approved'
  | 'return-rejected'
  | 'return-received'
  | 'refunded-mock';

export type BuyerOrderTimelineItem = {
  id: string;
  status: BuyerOrderTimelineStatus;
  label: string;
  description: string;
  createdAt: string;
  sellerOrderId?: string;
  returnRequestId?: string;
};

export type SuggestedChatAction = {
  mode: ChatFollowUpMode;
  label: string;
};

export type SearchContext = {
  searchId: string;
  query: string;
  surface: 'catalog' | 'chat';
  source: 'internal' | 'local';
  resultIds: string[];
  mode?: ChatFollowUpMode;
  anchorProductId?: string;
  createdAt: string;
};

export type RecentSearchEntry = {
  id: string;
  query: string;
  category?: Category;
  color?: string;
  size?: string;
  occasion?: OccasionTag;
  styles: StyleTag[];
  createdAt: string;
};

export type UserDataState = {
  styleProfile?: StyleProfile;
  cartItems?: CartItem[];
  favoriteProductIds?: string[];
  checkoutDetails?: CheckoutDetails;
  addresses?: AddressBookEntry[];
  paymentMethods?: SavedPaymentMethod[];
  recentSearches?: RecentSearchEntry[];
  userSettings?: UserSettings;
  updatedAt?: string;
};

export type SellerDraftRecord = {
  draft: SellerDraft;
  generatedListing?: GeneratedListing;
  updatedAt: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
  sizeBought: string;
  fitResult: 'tight' | 'true' | 'loose';
  createdAt: string;
};

export type FitFeedback = {
  id: string;
  productId: string;
  userId: string;
  usualSize: string;
  boughtSize: string;
  result: 'tight' | 'true' | 'loose';
  createdAt: string;
};

export type FitRecommendation = {
  recommendedSize: string;
  confidence: 'high' | 'medium' | 'low';
  alternativeSize?: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
};

export type ComparisonRow = {
  productId: string;
  title: string;
  matchScore: number;
  price: number;
  occasion: string;
  styleFit: string;
  fitRisk: 'low' | 'medium' | 'high';
  modesty: ModestyLevel;
  verdict: string;
};

export type TryOnEnvironment = 'outdoor' | 'home' | 'party' | 'office' | 'holiday';

export type TryOnFrameMode = 'full_body' | 'upper_body' | 'lower_body' | 'accessory_focus';

export type TryOnState = {
  mode: 'avatar' | 'photo' | 'product';
  avatarUri: string;
  photoUri?: string;
  selectedSize: string;
  selectedColor: string;
  environment: TryOnEnvironment;
};

export type TryOnInput = {
  product: {
    id: string;
    title: string;
    imageUrl: string;
    color: string;
    category: Category;
    fit: string;
  };
  mode: TryOnState['mode'];
  modelImageUri: string;
  modelImageStoragePath?: string;
  selectedSize: string;
  selectedColor: string;
  environment: TryOnEnvironment;
  frameMode?: TryOnFrameMode;
  outfitProductIds?: string[];
};

export type TryOnPreview = {
  id: string;
  productId: string;
  productTitle: string;
  productImageUri: string;
  modelImageUri: string;
  previewImageUri: string;
  mode: TryOnState['mode'];
  selectedSize: string;
  selectedColor: string;
  environment: TryOnEnvironment;
  frameMode?: TryOnFrameMode;
  source: TryOnSource;
  provider?: 'mock' | 'gemini';
  jobId?: string;
  previewStoragePath?: string;
  expiresAt?: string;
  confidence: 'high' | 'medium' | 'low';
  fitNote: string;
  overlayLabel: string;
  disclaimer: string;
  generatedAt: string;
};

export type TryOnJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type TryOnJob = {
  id: string;
  userId: string;
  status: TryOnJobStatus;
  input: TryOnInput;
  provider: 'gemini';
  creditCost?: number;
  chargedCredits?: boolean;
  sponsoredCredits?: number;
  sponsoredBySellerId?: string;
  sponsorCampaignId?: string;
  refundedCredits?: boolean;
  preview?: TryOnPreview;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt?: string;
};

export type CreateTryOnJobResult = {
  job: TryOnJob;
  buyerCredits?: BuyerCreditAccount;
};

export type TryOnResult = {
  preview: TryOnPreview;
  buyerCredits?: BuyerCreditAccount;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
};

export type TryOnProvider = {
  generatePreview: (input: TryOnInput) => Promise<TryOnResult>;
};

export type AnalyticsEventName =
  | 'chat_prompt_submitted'
  | 'product_detail_opened'
  | 'favorite_toggled'
  | 'add_to_cart'
  | 'try_on_opened'
  | 'try_on_preview_generated'
  | 'try_on_to_checkout'
  | 'purchase_completed'
  | 'seller_listing_generated'
  | 'seller_listing_published'
  | 'seller_ai_credit_package_claimed'
  | 'buyer_credit_campaign_claimed'
  | 'seller_reward_campaign_created'
  | 'seller_reward_campaign_archived'
  | 'product_review_added'
  | 'fit_feedback_added'
  | 'seller_product_updated'
  | 'seller_product_archived'
  | 'seller_product_activated'
  | 'seller_product_deleted'
  | 'seller_product_ai_improved'
  | 'seller_order_detail_opened'
  | 'seller_order_status_updated'
  | 'seller_store_viewed'
  | 'buyer_order_detail_opened'
  | 'store_detail_opened'
  | 'catalog_opened'
  | 'catalog_filter_changed'
  | 'catalog_search_submitted'
  | 'catalog_search_results_loaded'
  | 'catalog_search_zero_results'
  | 'favorites_opened'
  | 'chat_follow_up_requested'
  | 'chat_new_started'
  | 'chat_history_opened'
  | 'chat_same_seller_requested'
  | 'chat_similar_budget_requested'
  | 'chat_similar_products_requested'
  | 'checkout_validation_failed'
  | 'checkout_commit_failed'
  | 'return_request_submitted'
  | 'seller_return_status_updated'
  | 'seller_tracking_updated'
  | 'onboarding_completed'
  | 'auth_signed_in'
  | 'auth_signed_out';

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type SearchAnalyticsEventType =
  | 'catalog_search_submitted'
  | 'catalog_search_results_loaded'
  | 'catalog_search_zero_results'
  | 'chat_follow_up_requested'
  | 'server_catalog_search_executed'
  | 'server_chat_recommend_executed'
  | 'server_search_zero_results'
  | 'server_search_fallback_used'
  | 'search_result_product_opened'
  | 'search_result_add_to_cart'
  | 'search_result_try_on_opened'
  | 'search_result_purchase_completed';

export type SearchAnalyticsRecord = {
  id: string;
  origin?: 'client' | 'server';
  userId?: string;
  sessionId: string;
  source: 'catalog' | 'chat';
  eventType: SearchAnalyticsEventType;
  query?: string;
  searchId?: string;
  mode?: ChatFollowUpMode;
  anchorProductId?: string;
  productId?: string;
  resultCount?: number;
  resultIds?: string[];
  filters?: Record<string, string | number | boolean>;
  durationMs?: number;
  aiMode?: 'gemini' | 'mock-fallback';
  fallbackReason?: string;
  createdAt: string;
};

export type SellerDraft = {
  imageUrl: string;
  price: string;
  stock: string;
  sizes: string;
  optionalName: string;
  optionalCategory: string;
};

export type VisibilityScoreBreakdown = {
  image: number;
  price: number;
  stock: number;
  sizes: number;
  category: number;
  naming: number;
  metadataDepth: number;
};

export type GeneratedListing = {
  title: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  category: Category;
  styleTags: StyleTag[];
  vibeTags: string[];
  occasionTags: OccasionTag[];
  color: string;
  fit: string;
  modesty: ModestyLevel;
  season: string[];
  aiSearchIntents: string[];
  visibilityScore: number;
  visibilityScoreBreakdown: VisibilityScoreBreakdown;
  aiSource: AISource;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  recommendation: string;
  status: 'draft' | 'published';
};

export type ProductIntelligenceInput = {
  draft: SellerDraft;
  previousListing?: GeneratedListing;
  variant?: number;
};

export type ProductIntelligenceResult = {
  listing: GeneratedListing;
  sellerCredits?: SellerCreditAccount;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
};

export type ProductImageEnhancementInput = {
  imageUrl: string;
  mode: ProductImageEnhancementMode;
  draftContext?: Partial<SellerDraft>;
};

export type ProductImageEnhancementMode =
  | 'catalog_white'
  | 'premium_studio'
  | 'editorial_minimal'
  | 'lifestyle_commerce';

export type ProductImageEnhancementResult = {
  enhancedImageUrl: string;
  enhancedStoragePath?: string;
  sellerCredits?: SellerCreditAccount;
  source: 'remote' | 'mock';
  mode: ProductImageEnhancementMode;
  cost: number;
  diagnostics?: {
    endpoint?: string;
    durationMs?: number;
    fallbackReason?: string;
  };
};

export type AIProductIntelligenceProvider = {
  generateListing: (input: ProductIntelligenceInput) => Promise<ProductIntelligenceResult>;
};

export type SellerCreditAccount = {
  sellerId: string;
  freeCredits: number;
  paidCredits: number;
  totalGrantedCredits: number;
  totalUsedCredits: number;
  creditDebtAmount: number;
  creditLimitAmount: number;
  welcomeGrantApplied: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerCreditPackageId = 'credits_100' | 'credits_200' | 'credits_500';

export type SellerCreditPackage = {
  id: SellerCreditPackageId;
  credits: number;
  amountTRY: number;
  label: string;
  description: string;
};

export type SellerCreditLedgerEntry = {
  id: string;
  sellerId: string;
  type:
    | 'welcome_grant'
    | 'ai_generation_spent'
    | 'product_image_enhance_spent'
    | 'package_credit_grant'
    | 'credit_debt_created'
    | 'manual_adjustment';
  creditAmount: number;
  amountTRY: number;
  balanceAfter: {
    freeCredits: number;
    paidCredits: number;
  };
  note: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type BuyerCreditLedgerType =
  | 'welcome_grant'
  | 'try_on_spent'
  | 'try_on_refund'
  | 'sponsored_try_on_used'
  | 'purchase_reward'
  | 'review_reward'
  | 'fit_feedback_reward'
  | 'store_campaign_reward'
  | 'reward_reversed'
  | 'manual_adjustment';

export type BuyerCreditAccount = {
  buyerId: string;
  freeCredits: number;
  paidCredits: number;
  totalGrantedCredits: number;
  totalUsedCredits: number;
  welcomeGrantApplied: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BuyerCreditLedgerEntry = {
  id: string;
  buyerId: string;
  type: BuyerCreditLedgerType;
  creditAmount: number;
  balanceAfter: {
    freeCredits: number;
    paidCredits: number;
  };
  note: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type SellerRewardCampaignType =
  | 'purchase_reward'
  | 'review_reward'
  | 'fit_feedback_reward'
  | 'store_promo'
  | 'sponsored_try_on';

export type SellerRewardCampaignStatus = 'active' | 'paused' | 'archived';

export type SellerRewardCampaign = {
  kind: 'seller_reward_campaign';
  id: string;
  sellerId: string;
  type: SellerRewardCampaignType;
  title: string;
  description: string;
  rewardCredits: number;
  budgetCredits: number;
  spentCredits: number;
  status: SellerRewardCampaignStatus;
  startsAt?: string;
  endsAt?: string;
  productIds?: string[];
  categoryFilter?: Category[];
  minOrderAmount?: number;
  perUserLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type BuyerCreditTask = {
  id: string;
  type: 'purchase' | 'review' | 'fit_feedback' | 'campaign' | 'sponsored_try_on';
  title: string;
  description: string;
  rewardCredits: number;
  actionLabel: string;
  productId?: string;
  productTitle?: string;
  sellerId?: string;
  campaignId?: string;
};

export type BuyerCreditCenter = {
  account: BuyerCreditAccount;
  giftCredits: BuyerCreditLedgerEntry[];
  tasks: BuyerCreditTask[];
  campaigns: SellerRewardCampaign[];
  ledger: BuyerCreditLedgerEntry[];
  earningRules: Array<{
    id: string;
    title: string;
    description: string;
    rewardCredits: number;
  }>;
};
