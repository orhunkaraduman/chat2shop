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

export type AISource = 'mock' | 'remote' | 'remote-fallback' | 'manual';

export type RetrievalMode = 'internal' | 'local';

export type TryOnFrameMode = 'full_body' | 'upper_body' | 'lower_body' | 'accessory_focus';

export type ChatFollowUpMode =
  | 'default'
  | 'same_seller'
  | 'similar_budget'
  | 'similar_products'
  | 'dressier'
  | 'simpler'
  | 'more_casual';

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
  previousListing?: Partial<GeneratedListing>;
  variant?: number;
};

export type ProductIntelligenceResult = {
  listing: GeneratedListing;
  sellerCredits?: SellerCreditAccount;
};

export const PRODUCT_IMAGE_ENHANCEMENT_MODES = [
  'catalog_white',
  'premium_studio',
  'editorial_minimal',
  'lifestyle_commerce',
] as const;

export type ProductImageEnhancementMode = (typeof PRODUCT_IMAGE_ENHANCEMENT_MODES)[number];

export type ProductImageEnhancementInput = {
  imageUrl: string;
  mode: ProductImageEnhancementMode;
  draftContext?: Partial<SellerDraft>;
};

export type ProductImageEnhancementResult = {
  enhancedImageUrl: string;
  enhancedStoragePath: string;
  sellerCredits: SellerCreditAccount;
  source: 'remote';
  mode: ProductImageEnhancementMode;
  cost: number;
};

export type SellerCreditLedgerType =
  | 'welcome_grant'
  | 'ai_generation_spent'
  | 'product_image_enhance_spent'
  | 'package_credit_grant'
  | 'credit_debt_created'
  | 'manual_adjustment';

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
  type: SellerCreditLedgerType;
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

export type ProductSearchCandidate = {
  id: string;
  title: string;
  seller: string;
  sellerId?: string;
  price: number;
  color: string;
  sizes: string[];
  visibilityScore: number;
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
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = ProductSearchCandidate & {
  sellerId: string;
  imageUrl: string;
  stock: number;
  status: 'draft' | 'active' | 'archived';
  source: 'firebase-seller';
  sizeChart?: Array<{
    size: string;
    chest?: string;
    waist?: string;
    hip?: string;
    length?: string;
  }>;
};

export type RankedRecommendation = {
  productId: string;
  matchScore: number;
  reason: string;
  highlights: string[];
  product?: ProductSearchCandidate;
};

export type ChatRecommendInput = {
  prompt: string;
  profile: StyleProfile;
  candidates?: ProductSearchCandidate[];
  mode?: ChatFollowUpMode;
  anchorProductId?: string;
  limit?: number;
};

export type ChatRecommendResult = {
  searchId: string;
  intent: UserIntent;
  recommendations: RankedRecommendation[];
  source: RetrievalMode | AISource;
  mode?: ChatFollowUpMode;
  explanation?: string;
};

export type SearchIntentInput = {
  query: string;
  profile?: Partial<StyleProfile>;
};

export type SearchIntentResult = {
  intent: UserIntent;
  filters: {
    category?: Category;
    color?: string;
    size?: string;
    styles: StyleTag[];
    occasion?: OccasionTag;
    budgetMax?: number;
  };
  source: AISource;
};

export type CatalogSearchInput = {
  query: string;
  profile?: Partial<StyleProfile>;
  filters?: {
    category?: Category;
    color?: string;
    size?: string;
    styles?: StyleTag[];
    occasion?: OccasionTag;
    budgetMax?: number;
  };
  sort?: 'ai' | 'priceAsc' | 'priceDesc' | 'new';
  page?: number;
  pageSize?: number;
  anchorProductId?: string;
  mode?: ChatFollowUpMode;
};

export type CatalogSearchResult = {
  searchId: string;
  intent: UserIntent;
  appliedFilters: {
    category?: Category;
    color?: string;
    size?: string;
    styles: StyleTag[];
    occasion?: OccasionTag;
    budgetMax?: number;
  };
  results: RankedRecommendation[];
  resultIds: string[];
  resultCount: number;
  page: number;
  hasMore: boolean;
  explanation: string;
  source: RetrievalMode;
  diagnostics?: {
    fallbackReason?: string;
    durationMs?: number;
  };
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
  mode: 'avatar' | 'photo' | 'product';
  modelImageUri: string;
  modelImageStoragePath?: string;
  selectedSize: string;
  selectedColor: string;
  environment?: 'outdoor' | 'home' | 'party' | 'office' | 'holiday';
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
  mode: TryOnInput['mode'];
  selectedSize: string;
  selectedColor: string;
  environment?: TryOnInput['environment'];
  frameMode?: TryOnFrameMode;
  source: AISource;
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

export type TryOnResult = {
  preview: TryOnPreview;
  buyerCredits?: BuyerCreditAccount;
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
