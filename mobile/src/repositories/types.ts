import {
  AddressBookEntry,
  AppUser,
  CartItem,
  CheckoutDetails,
  FitFeedback,
  Order,
  Product,
  BuyerCreditAccount,
  BuyerCreditCenter,
  ProductReview,
  ReturnRequest,
  ReturnRequestStatus,
  SavedPaymentMethod,
  SearchAnalyticsRecord,
  RepositoryMode,
  GeneratedListing,
  SellerDraft,
  SellerDraftRecord,
  SellerCreditAccount,
  SellerCreditPackage,
  SellerCreditPackageId,
  SellerOrder,
  SellerOrderStatus,
  SellerProductStatus,
  SellerRewardCampaign,
  SellerStore,
  StyleProfile,
  UserDataState,
  UserRole,
} from '@/types';

export type AuthRepository = {
  mode: RepositoryMode;
  getCurrentUser: () => Promise<AppUser | undefined>;
  onAuthStateChanged: (callback: (user?: AppUser) => void) => () => void;
  signUp: (email: string, password: string, role: UserRole) => Promise<AppUser>;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  getIdToken?: () => Promise<string | undefined>;
};

export type UserRepository = {
  upsertUser: (user: AppUser) => Promise<void>;
  updateStyleProfile: (userId: string, profile: StyleProfile) => Promise<void>;
};

export type UserDataRepository = {
  getUserData: (userId: string) => Promise<UserDataState | undefined>;
  saveUserData: (
    userId: string,
    data: {
        styleProfile: StyleProfile;
        cartItems: CartItem[];
        favoriteProductIds: string[];
        checkoutDetails: CheckoutDetails;
        addresses: AddressBookEntry[];
        paymentMethods: SavedPaymentMethod[];
        recentSearches: UserDataState['recentSearches'];
        userSettings: UserDataState['userSettings'];
      },
  ) => Promise<void>;
};

export type ProductRepository = {
  listProducts: () => Promise<Product[]>;
  listSellerProducts: (sellerId: string) => Promise<Product[]>;
  createProduct: (product: Product) => Promise<Product>;
  publishProduct: (input: { draft: SellerDraft; listing: GeneratedListing }) => Promise<Product>;
  updateProduct: (productId: string, patch: Partial<Product>) => Promise<void>;
  updateStatus: (productId: string, status: SellerProductStatus) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
};

export type OrderRepository = {
  listOrders: (userId: string) => Promise<Order[]>;
  createOrder: (userId: string, order: Order) => Promise<Order>;
  updateOrder: (userId: string, orderId: string, patch: Partial<Order>) => Promise<void>;
};

export type CheckoutRepository = {
  createCheckout: (input: {
    buyerId: string;
    order: Order;
    sellerOrders: SellerOrder[];
  }) => Promise<{
    order: Order;
    sellerOrders: SellerOrder[];
    buyerCredits?: BuyerCreditAccount;
  }>;
};

export type SellerDraftRepository = {
  getCurrentDraft: (userId: string) => Promise<SellerDraftRecord | undefined>;
  saveCurrentDraft: (userId: string, record: SellerDraftRecord) => Promise<void>;
};

export type SellerCreditRepository = {
  getAccount: (sellerId: string) => Promise<SellerCreditAccount | undefined>;
  purchasePackage: (
    sellerId: string,
    packageId: SellerCreditPackageId,
  ) => Promise<{ sellerCredits: SellerCreditAccount; package: SellerCreditPackage }>;
};

export type BuyerCreditRepository = {
  getAccount: (buyerId: string) => Promise<BuyerCreditAccount | undefined>;
  getCenter: (buyerId: string) => Promise<BuyerCreditCenter | undefined>;
  claimCampaignReward: (
    buyerId: string,
    input: { sellerId: string; campaignId: string },
  ) => Promise<{ buyerCredits: BuyerCreditAccount; campaign: SellerRewardCampaign }>;
  submitProductReview: (
    buyerId: string,
    input: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>,
  ) => Promise<{
    review: ProductReview;
    fitFeedback: FitFeedback;
    buyerCredits: BuyerCreditAccount;
    reward?: unknown;
  }>;
  submitFitFeedback: (
    buyerId: string,
    input: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>,
  ) => Promise<{
    fitFeedback: FitFeedback;
    buyerCredits: BuyerCreditAccount;
    reward?: unknown;
  }>;
  spendTryOnCredit?: (buyerId: string) => Promise<BuyerCreditAccount>;
};

export type SellerRewardCampaignRepository = {
  listCampaigns: (sellerId: string) => Promise<SellerRewardCampaign[]>;
  saveCampaign: (campaign: SellerRewardCampaign) => Promise<SellerRewardCampaign>;
  archiveCampaign: (sellerId: string, campaignId: string) => Promise<void>;
};

export type SellerStoreRepository = {
  getStore: (sellerId: string) => Promise<SellerStore | undefined>;
  saveStore: (store: SellerStore) => Promise<SellerStore>;
};

export type SellerOrderRepository = {
  listOrders: (sellerId: string) => Promise<SellerOrder[]>;
  listBuyerOrders: (buyerId: string) => Promise<SellerOrder[]>;
  createOrder: (order: SellerOrder) => Promise<SellerOrder>;
  updateStatus: (sellerId: string, orderId: string, status: SellerOrderStatus) => Promise<void>;
  updateOrder: (sellerId: string, orderId: string, patch: Partial<SellerOrder>) => Promise<void>;
};

export type ReturnRequestRepository = {
  listBuyerRequests: (buyerId: string) => Promise<ReturnRequest[]>;
  listSellerRequests: (sellerId: string) => Promise<ReturnRequest[]>;
  createRequest: (buyerId: string, request: ReturnRequest) => Promise<ReturnRequest>;
  updateRequestStatus: (
    buyerId: string,
    requestId: string,
    status: ReturnRequestStatus,
    patch?: Partial<ReturnRequest>,
  ) => Promise<void>;
};

export type ReviewRepository = {
  listReviews: (productId: string) => Promise<ProductReview[]>;
  addReview: (review: ProductReview) => Promise<ProductReview>;
};

export type FitFeedbackRepository = {
  listFeedback: (productId: string) => Promise<FitFeedback[]>;
  addFeedback: (feedback: FitFeedback) => Promise<FitFeedback>;
};

export type SearchAnalyticsRepository = {
  createRecord: (record: SearchAnalyticsRecord) => Promise<void>;
};

export type AppRepositories = {
  mode: RepositoryMode;
  auth: AuthRepository;
  users: UserRepository;
  userData: UserDataRepository;
  products: ProductRepository;
  orders: OrderRepository;
  checkout: CheckoutRepository;
  sellerDrafts: SellerDraftRepository;
  sellerCredits: SellerCreditRepository;
  buyerCredits: BuyerCreditRepository;
  sellerRewardCampaigns: SellerRewardCampaignRepository;
  sellerStores: SellerStoreRepository;
  sellerOrders: SellerOrderRepository;
  returnRequests: ReturnRequestRepository;
  reviews: ReviewRepository;
  fitFeedback: FitFeedbackRepository;
  searchAnalytics: SearchAnalyticsRepository;
};
