import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AddressBookEntry,
  AnalyticsEvent,
  CartItem,
  ChatConversation,
  CheckoutDetails,
  FitFeedback,
  GeneratedListing,
  Order,
  Product,
  ProductReview,
  RecentSearchEntry,
  ReturnRequest,
  SavedPaymentMethod,
  SellerOrder,
  SellerDraft,
  SellerStore,
  StyleProfile,
  TryOnPreview,
  UserSettings,
} from '@/types';

export type PersistedAppState = {
  profile?: StyleProfile;
  cartItems?: CartItem[];
  favoriteProductIds?: string[];
  sellerDraft?: SellerDraft;
  sellerDraftUpdatedAt?: string;
  generatedListing?: GeneratedListing;
  publishedListings?: GeneratedListing[];
  sellerProducts?: Product[];
  orders?: Order[];
  sellerStore?: SellerStore;
  sellerOrders?: SellerOrder[];
  productReviews?: ProductReview[];
  fitFeedback?: FitFeedback[];
  analyticsEvents?: AnalyticsEvent[];
  checkoutDetails?: CheckoutDetails;
  addresses?: AddressBookEntry[];
  paymentMethods?: SavedPaymentMethod[];
  returnRequests?: ReturnRequest[];
  recentSearches?: RecentSearchEntry[];
  tryOnHistory?: TryOnPreview[];
  userSettings?: UserSettings;
  chatConversations?: ChatConversation[];
  activeChatConversationId?: string;
};

const keys = {
  profile: 'chat2shop.profile',
  cartItems: 'chat2shop.cartItems',
  favoriteProductIds: 'chat2shop.favoriteProductIds',
  sellerDraft: 'chat2shop.sellerDraft',
  sellerDraftUpdatedAt: 'chat2shop.sellerDraftUpdatedAt',
  generatedListing: 'chat2shop.generatedListing',
  publishedListings: 'chat2shop.publishedListings',
  sellerProducts: 'chat2shop.sellerProducts',
  orders: 'chat2shop.orders',
  sellerStore: 'chat2shop.sellerStore',
  sellerOrders: 'chat2shop.sellerOrders',
  productReviews: 'chat2shop.productReviews',
  fitFeedback: 'chat2shop.fitFeedback',
  analyticsEvents: 'chat2shop.analyticsEvents',
  checkoutDetails: 'chat2shop.checkoutDetails',
  addresses: 'chat2shop.addresses',
  paymentMethods: 'chat2shop.paymentMethods',
  returnRequests: 'chat2shop.returnRequests',
  recentSearches: 'chat2shop.recentSearches',
  tryOnHistory: 'chat2shop.tryOnHistory',
  userSettings: 'chat2shop.userSettings',
  chatConversations: 'chat2shop.chatConversations',
  activeChatConversationId: 'chat2shop.activeChatConversationId',
};

export async function loadPersistedState(): Promise<PersistedAppState> {
  const entries = await AsyncStorage.multiGet(Object.values(keys));
  const state: PersistedAppState = {};

  for (const [key, value] of entries) {
    if (!value) {
      continue;
    }

    const parsed = JSON.parse(value);
    if (key === keys.profile) state.profile = parsed;
    if (key === keys.cartItems) state.cartItems = parsed;
    if (key === keys.favoriteProductIds) state.favoriteProductIds = parsed;
    if (key === keys.sellerDraft) state.sellerDraft = parsed;
    if (key === keys.sellerDraftUpdatedAt) state.sellerDraftUpdatedAt = parsed;
    if (key === keys.generatedListing) state.generatedListing = parsed;
    if (key === keys.publishedListings) state.publishedListings = parsed;
    if (key === keys.sellerProducts) state.sellerProducts = parsed;
    if (key === keys.orders) state.orders = parsed;
    if (key === keys.sellerStore) state.sellerStore = parsed;
    if (key === keys.sellerOrders) state.sellerOrders = parsed;
    if (key === keys.productReviews) state.productReviews = parsed;
    if (key === keys.fitFeedback) state.fitFeedback = parsed;
    if (key === keys.analyticsEvents) state.analyticsEvents = parsed;
    if (key === keys.checkoutDetails) state.checkoutDetails = parsed;
    if (key === keys.addresses) state.addresses = parsed;
    if (key === keys.paymentMethods) state.paymentMethods = parsed;
    if (key === keys.returnRequests) state.returnRequests = parsed;
    if (key === keys.recentSearches) state.recentSearches = parsed;
    if (key === keys.tryOnHistory) state.tryOnHistory = parsed;
    if (key === keys.userSettings) state.userSettings = parsed;
    if (key === keys.chatConversations) state.chatConversations = parsed;
    if (key === keys.activeChatConversationId) state.activeChatConversationId = parsed;
  }

  return state;
}

export async function persistProfile(profile: StyleProfile) {
  await save(keys.profile, profile);
}

export async function persistCartItems(items: CartItem[]) {
  await save(keys.cartItems, items);
}

export async function persistFavoriteProductIds(ids: string[]) {
  await save(keys.favoriteProductIds, ids);
}

export async function persistSellerDraft(draft: SellerDraft) {
  await save(keys.sellerDraft, draft);
}

export async function persistSellerDraftUpdatedAt(updatedAt: string) {
  await save(keys.sellerDraftUpdatedAt, updatedAt);
}

export async function persistGeneratedListing(listing?: GeneratedListing) {
  if (!listing) {
    await AsyncStorage.removeItem(keys.generatedListing);
    return;
  }

  await save(keys.generatedListing, listing);
}

export async function persistPublishedListings(listings: GeneratedListing[]) {
  await save(keys.publishedListings, listings);
}

export async function persistSellerProducts(products: Product[]) {
  await save(keys.sellerProducts, products);
}

export async function persistOrders(orders: Order[]) {
  await save(keys.orders, orders);
}

export async function persistSellerStore(store: SellerStore) {
  await save(keys.sellerStore, store);
}

export async function persistSellerOrders(orders: SellerOrder[]) {
  await save(keys.sellerOrders, orders);
}

export async function persistProductReviews(reviews: ProductReview[]) {
  await save(keys.productReviews, reviews);
}

export async function persistFitFeedback(feedback: FitFeedback[]) {
  await save(keys.fitFeedback, feedback);
}

export async function persistAnalyticsEvents(events: AnalyticsEvent[]) {
  await save(keys.analyticsEvents, events.slice(-100));
}

export async function persistCheckoutDetails(details: CheckoutDetails) {
  await save(keys.checkoutDetails, details);
}

export async function persistAddresses(addresses: AddressBookEntry[]) {
  await save(keys.addresses, addresses);
}

export async function persistPaymentMethods(paymentMethods: SavedPaymentMethod[]) {
  await save(keys.paymentMethods, paymentMethods);
}

export async function persistReturnRequests(returnRequests: ReturnRequest[]) {
  await save(keys.returnRequests, returnRequests);
}

export async function persistRecentSearches(recentSearches: RecentSearchEntry[]) {
  await save(keys.recentSearches, recentSearches.slice(0, 8));
}

export async function persistTryOnHistory(history: TryOnPreview[]) {
  await save(keys.tryOnHistory, history.slice(0, 12));
}

export async function persistUserSettings(settings: UserSettings) {
  await save(keys.userSettings, settings);
}

export async function persistChatConversations(conversations: ChatConversation[], activeConversationId?: string) {
  await Promise.all([
    save(keys.chatConversations, conversations),
    activeConversationId
      ? save(keys.activeChatConversationId, activeConversationId)
      : AsyncStorage.removeItem(keys.activeChatConversationId),
  ]);
}

async function save(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
