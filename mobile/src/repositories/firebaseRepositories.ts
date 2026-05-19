import {
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firebaseAuth, firestoreDb } from '@/config/firebase';
import {
  AppUser,
  BuyerCreditAccount,
  CheckoutDetails,
  FitFeedback,
  GeneratedListing,
  Order,
  Product,
  ProductReview,
  ReturnRequest,
  ReturnRequestStatus,
  SearchAnalyticsRecord,
  SellerCreditAccount,
  SellerCreditPackage,
  SellerCreditPackageId,
  SellerDraft,
  SellerDraftRecord,
  SellerOrder,
  SellerOrderStatus,
  SellerProductStatus,
  SellerRewardCampaign,
  SellerStore,
  StyleProfile,
  UserDataState,
  UserRole,
} from '@/types';

import { AppRepositories } from './types';

const checkoutCommitEndpoint = process.env.EXPO_PUBLIC_CHECKOUT_COMMIT_ENDPOINT;
const checkoutCommitTimeoutMs = Number(process.env.EXPO_PUBLIC_CHECKOUT_COMMIT_TIMEOUT_MS) || 12000;
const productPublishEndpoint = process.env.EXPO_PUBLIC_PRODUCT_PUBLISH_ENDPOINT;
const productPublishTimeoutMs = Number(process.env.EXPO_PUBLIC_PRODUCT_PUBLISH_TIMEOUT_MS) || 12000;
const sellerCreditSummaryEndpoint = process.env.EXPO_PUBLIC_SELLER_CREDIT_SUMMARY_ENDPOINT;
const sellerCreditSummaryTimeoutMs = Number(process.env.EXPO_PUBLIC_SELLER_CREDIT_SUMMARY_TIMEOUT_MS) || 8000;
const sellerCreditPurchaseEndpoint = process.env.EXPO_PUBLIC_SELLER_CREDIT_PURCHASE_ENDPOINT;
const sellerCreditPurchaseTimeoutMs = Number(process.env.EXPO_PUBLIC_SELLER_CREDIT_PURCHASE_TIMEOUT_MS) || 10000;
const buyerCreditSummaryEndpoint = process.env.EXPO_PUBLIC_BUYER_CREDIT_SUMMARY_ENDPOINT;
const buyerCreditSummaryTimeoutMs = Number(process.env.EXPO_PUBLIC_BUYER_CREDIT_SUMMARY_TIMEOUT_MS) || 8000;
const buyerCreditCenterEndpoint = process.env.EXPO_PUBLIC_BUYER_CREDIT_CENTER_ENDPOINT;
const buyerCampaignRewardEndpoint = process.env.EXPO_PUBLIC_BUYER_CAMPAIGN_REWARD_ENDPOINT;
const productReviewEndpoint = process.env.EXPO_PUBLIC_PRODUCT_REVIEW_ENDPOINT;
const fitFeedbackRewardEndpoint =
  process.env.EXPO_PUBLIC_FIT_FEEDBACK_ENDPOINT ||
  productReviewEndpoint?.replace('submitProductReview', 'submitFitFeedback').replace('submit-product-review', 'submit-fit-feedback');
const buyerRewardTimeoutMs = Number(process.env.EXPO_PUBLIC_BUYER_REWARD_TIMEOUT_MS) || 10000;
const returnRequestStatusEndpoint = process.env.EXPO_PUBLIC_RETURN_REQUEST_STATUS_ENDPOINT;
const returnRequestStatusTimeoutMs = Number(process.env.EXPO_PUBLIC_RETURN_REQUEST_STATUS_TIMEOUT_MS) || 10000;

export function createFirebaseRepositories(): AppRepositories {
  const auth = assertAuth();
  const db = assertDb();

  return {
    mode: 'firebase',
    auth: {
      mode: 'firebase',
      async getCurrentUser() {
        if (!auth.currentUser) return undefined;
        return getAppUser(auth.currentUser.uid, auth.currentUser.email ?? '');
      },
      onAuthStateChanged(callback) {
        return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
          if (!firebaseUser) {
            callback(undefined);
            return;
          }

          void getAppUser(firebaseUser.uid, firebaseUser.email ?? '')
            .then(callback)
            .catch(() => callback(undefined));
        });
      },
      async signUp(email: string, password: string, role: UserRole) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const now = new Date().toISOString();
        const user: AppUser = {
          id: credential.user.uid,
          email: credential.user.email ?? email,
          role,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'users', user.id), user);
        return user;
      },
      async signIn(email: string, password: string) {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return getAppUser(credential.user.uid, credential.user.email ?? email);
      },
      async signOut() {
        await firebaseSignOut(auth);
      },
      async getIdToken() {
        return auth.currentUser?.getIdToken();
      },
    },
    users: {
      async upsertUser(user: AppUser) {
        await setDoc(doc(db, 'users', user.id), user, { merge: true });
      },
      async updateStyleProfile(userId: string, profile: StyleProfile) {
        await setDoc(
          doc(db, 'users', userId),
          {
            styleProfile: profile,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      },
    },
    userData: {
      async getUserData(userId: string) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return undefined;

        const data = userDoc.data() as UserDataState;
        return {
          styleProfile: data.styleProfile,
          cartItems: data.cartItems ?? [],
          favoriteProductIds: data.favoriteProductIds ?? [],
          checkoutDetails: data.checkoutDetails,
          addresses: data.addresses ?? [],
          paymentMethods: data.paymentMethods ?? [],
          recentSearches: data.recentSearches ?? [],
          userSettings: data.userSettings,
          updatedAt: data.updatedAt,
        };
      },
      async saveUserData(
        userId: string,
        data: {
          styleProfile: StyleProfile;
          cartItems: UserDataState['cartItems'];
          favoriteProductIds: string[];
          checkoutDetails: CheckoutDetails;
          addresses: UserDataState['addresses'];
          paymentMethods: UserDataState['paymentMethods'];
          recentSearches: UserDataState['recentSearches'];
          userSettings: UserDataState['userSettings'];
        },
      ) {
        await setDoc(
          doc(db, 'users', userId),
          {
            styleProfile: data.styleProfile,
            cartItems: data.cartItems ?? [],
            favoriteProductIds: data.favoriteProductIds,
            checkoutDetails: data.checkoutDetails,
            addresses: data.addresses ?? [],
            paymentMethods: data.paymentMethods ?? [],
            recentSearches: data.recentSearches ?? [],
            userSettings: data.userSettings,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      },
    },
    products: {
      async listProducts() {
        const snapshot = await getDocs(query(collection(db, 'products'), where('status', '==', 'active')));
        return snapshot.docs.map((item) => item.data() as Product);
      },
      async listSellerProducts(sellerId: string) {
        const snapshot = await getDocs(query(collection(db, 'products'), where('sellerId', '==', sellerId)));
        return snapshot.docs.map((item) => item.data() as Product);
      },
      async createProduct(product: Product) {
        throw new Error('Firebase modunda ürün oluşturma publishProduct Function üzerinden yapılmalı.');
      },
      async publishProduct({ draft, listing }) {
        if (!productPublishEndpoint) {
          throw new Error('Product publish endpoint is not configured.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token) {
          throw new Error('Ürün yayınlamak için geçerli satıcı oturumu bulunamadı.');
        }

        return postProductPublish(productPublishEndpoint, token, { draft, listing });
      },
      async updateProduct(productId: string, patch: Partial<Product>) {
        const payload = sanitizeProductPatch(patch);
        await updateDoc(doc(db, 'products', productId), {
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      },
      async updateStatus(productId: string, status: SellerProductStatus) {
        await updateDoc(doc(db, 'products', productId), {
          status,
          updatedAt: new Date().toISOString(),
        });
      },
      async deleteProduct(productId: string) {
        await deleteDoc(doc(db, 'products', productId));
      },
    },
    orders: {
      async listOrders(userId: string) {
        const snapshot = await getDocs(collection(db, 'orders', userId, 'items'));
        return snapshot.docs
          .map((item) => item.data() as Order)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async createOrder(userId: string, order: Order) {
        await setDoc(doc(db, 'orders', userId, 'items', order.id), stripUndefined(order));
        return order;
      },
      async updateOrder(userId: string, orderId: string, patch: Partial<Order>) {
        await updateDoc(doc(db, 'orders', userId, 'items', orderId), {
          ...stripUndefined(patch),
        });
      },
    },
    checkout: {
      async createCheckout({ buyerId, order, sellerOrders }) {
        if (!checkoutCommitEndpoint) {
          throw new Error('Checkout commit endpoint is not configured.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Siparişi tamamlamak için geçerli oturum bulunamadı.');
        }

        return postCheckoutCommit(checkoutCommitEndpoint, token, { order, sellerOrders });
      },
    },
    sellerDrafts: {
      async getCurrentDraft(userId: string) {
        const draftDoc = await getDoc(doc(db, 'sellerDrafts', userId, 'drafts', 'current'));
        if (!draftDoc.exists()) return undefined;
        return draftDoc.data() as SellerDraftRecord;
      },
      async saveCurrentDraft(userId: string, record: SellerDraftRecord) {
        const payload: SellerDraftRecord = {
          draft: record.draft,
          updatedAt: record.updatedAt,
        };
        if (record.generatedListing) {
          payload.generatedListing = record.generatedListing;
        }
        await setDoc(doc(db, 'sellerDrafts', userId, 'drafts', 'current'), payload);
      },
    },
    sellerCredits: {
      async getAccount(sellerId: string) {
        if (!sellerCreditSummaryEndpoint) return undefined;

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== sellerId) {
          throw new Error('AI kredi bilgisini almak için geçerli satıcı oturumu bulunamadı.');
        }

        return getSellerCreditSummary(sellerCreditSummaryEndpoint, token);
      },
      async purchasePackage(sellerId: string, packageId: SellerCreditPackageId) {
        if (!sellerCreditPurchaseEndpoint) {
          throw new Error('AI kredi paketi endpoint bilgisi yapılandırılmadı.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== sellerId) {
          throw new Error('AI kredi paketi almak için geçerli satıcı oturumu bulunamadı.');
        }

        return purchaseSellerCreditPackage(sellerCreditPurchaseEndpoint, token, packageId);
      },
    },
    buyerCredits: {
      async getAccount(buyerId: string) {
        if (!buyerCreditSummaryEndpoint) return undefined;

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Kabin jeton bilgisini almak için geçerli müşteri oturumu bulunamadı.');
        }

        return getBuyerCreditSummary(buyerCreditSummaryEndpoint, token);
      },
      async getCenter(buyerId: string) {
        if (!buyerCreditCenterEndpoint) return undefined;

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Jeton merkezini görmek için geçerli müşteri oturumu bulunamadı.');
        }

        return getBuyerCreditCenter(buyerCreditCenterEndpoint, token);
      },
      async claimCampaignReward(buyerId: string, input: { sellerId: string; campaignId: string }) {
        if (!buyerCampaignRewardEndpoint) {
          throw new Error('Jeton kampanya endpoint bilgisi yapılandırılmadı.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Kampanya jetonu almak için geçerli müşteri oturumu bulunamadı.');
        }

        return claimBuyerCampaignReward(buyerCampaignRewardEndpoint, token, input);
      },
      async submitProductReview(buyerId: string, input: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) {
        if (!productReviewEndpoint) {
          throw new Error('Yorum endpoint bilgisi yapılandırılmadı.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Yorum göndermek için geçerli müşteri oturumu bulunamadı.');
        }

        return submitProductReview(productReviewEndpoint, token, input);
      },
      async submitFitFeedback(buyerId: string, input: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) {
        if (!fitFeedbackRewardEndpoint) {
          throw new Error('Fit feedback endpoint bilgisi yapılandırılmadı.');
        }

        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (!token || firebaseUser?.uid !== buyerId) {
          throw new Error('Fit feedback göndermek için geçerli müşteri oturumu bulunamadı.');
        }

        return submitFitFeedback(fitFeedbackRewardEndpoint, token, input);
      },
    },
    sellerRewardCampaigns: {
      async listCampaigns(sellerId: string) {
        const snapshot = await getDocs(collection(db, 'sellerRewardCampaigns', sellerId, 'items'));
        return snapshot.docs
          .map((item) => ({ ...(item.data() as SellerRewardCampaign), kind: 'seller_reward_campaign' as const }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async saveCampaign(campaign: SellerRewardCampaign) {
        const normalized = { ...campaign, kind: 'seller_reward_campaign' as const };
        await setDoc(doc(db, 'sellerRewardCampaigns', normalized.sellerId, 'items', normalized.id), normalized, { merge: true });
        return normalized;
      },
      async archiveCampaign(sellerId: string, campaignId: string) {
        await updateDoc(doc(db, 'sellerRewardCampaigns', sellerId, 'items', campaignId), {
          status: 'archived',
          updatedAt: new Date().toISOString(),
        });
      },
    },
    sellerStores: {
      async getStore(sellerId: string) {
        const storeDoc = await getDoc(doc(db, 'sellerStores', sellerId));
        if (!storeDoc.exists()) return undefined;
        return storeDoc.data() as SellerStore;
      },
      async saveStore(store: SellerStore) {
        await setDoc(doc(db, 'sellerStores', store.sellerId), store, { merge: true });
        return store;
      },
    },
    sellerOrders: {
      async listOrders(sellerId: string) {
        const snapshot = await getDocs(collection(db, 'sellerOrders', sellerId, 'items'));
        return snapshot.docs
          .map((item) => item.data() as SellerOrder)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async listBuyerOrders(buyerId: string) {
        const snapshot = await getDocs(query(collectionGroup(db, 'items'), where('buyerId', '==', buyerId)));
        return snapshot.docs
          .map((item) => item.data() as SellerOrder)
          .filter((order) => Boolean(order.sellerId && order.buyerOrderId && Array.isArray(order.items)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async createOrder(order: SellerOrder) {
        await setDoc(doc(db, 'sellerOrders', order.sellerId, 'items', order.id), stripUndefined(order));
        return order;
      },
      async updateStatus(sellerId: string, orderId: string, status: SellerOrderStatus) {
        await updateDoc(doc(db, 'sellerOrders', sellerId, 'items', orderId), {
          status,
          updatedAt: new Date().toISOString(),
        });
      },
      async updateOrder(sellerId: string, orderId: string, patch: Partial<SellerOrder>) {
        await updateDoc(doc(db, 'sellerOrders', sellerId, 'items', orderId), {
          ...stripUndefined(patch),
          updatedAt: new Date().toISOString(),
        });
      },
    },
    returnRequests: {
      async listBuyerRequests(buyerId: string) {
        const snapshot = await getDocs(collection(db, 'returnRequests', buyerId, 'items'));
        return snapshot.docs
          .map((item) => item.data() as ReturnRequest)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async listSellerRequests(sellerId: string) {
        const snapshot = await getDocs(query(collectionGroup(db, 'items'), where('sellerId', '==', sellerId)));
        return snapshot.docs
          .map((item) => item.data() as ReturnRequest)
          .filter((request) => Boolean(request.reason && request.buyerOrderId))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async createRequest(buyerId: string, request: ReturnRequest) {
        await setDoc(doc(db, 'returnRequests', buyerId, 'items', request.id), stripUndefined(request));
        return request;
      },
      async updateRequestStatus(
        buyerId: string,
        requestId: string,
        status: ReturnRequestStatus,
        patch?: Partial<ReturnRequest>,
      ) {
        const firebaseUser = auth.currentUser;
        const token = await firebaseUser?.getIdToken();
        if (returnRequestStatusEndpoint && token) {
          await postReturnRequestStatus(returnRequestStatusEndpoint, token, {
            buyerId,
            requestId,
            status,
            decisionNote: patch?.decisionNote,
          });
          return;
        }

        await updateDoc(doc(db, 'returnRequests', buyerId, 'items', requestId), {
          ...stripUndefined(patch ?? {}),
          status,
          updatedAt: new Date().toISOString(),
        });
      },
    },
    reviews: {
      async listReviews(productId: string) {
        const snapshot = await getDocs(collection(db, 'products', productId, 'reviews'));
        return snapshot.docs.map((item) => item.data() as ProductReview);
      },
      async addReview(review: ProductReview) {
        await setDoc(doc(db, 'products', review.productId, 'reviews', review.id), review);
        return review;
      },
    },
    fitFeedback: {
      async listFeedback(productId: string) {
        const snapshot = await getDocs(collection(db, 'products', productId, 'fitFeedback'));
        return snapshot.docs.map((item) => item.data() as FitFeedback);
      },
      async addFeedback(feedback: FitFeedback) {
        await setDoc(doc(db, 'products', feedback.productId, 'fitFeedback', feedback.id), feedback);
        return feedback;
      },
    },
    searchAnalytics: {
      async createRecord(record: SearchAnalyticsRecord) {
        await setDoc(doc(db, 'searchEvents', record.id), record);
      },
    },
  };

  async function getAppUser(uid: string, fallbackEmail: string): Promise<AppUser> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as AppUser;
    }

    const now = new Date().toISOString();
    const user: AppUser = {
      id: uid,
      email: fallbackEmail,
      role: 'buyer',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', uid), user);
    return user;
  }
}

function assertAuth() {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured.');
  }
  return firebaseAuth;
}

function assertDb() {
  if (!firestoreDb) {
    throw new Error('Firestore is not configured.');
  }
  return firestoreDb;
}

function normalizeProductForCreate(product: Product): Product {
  const now = new Date().toISOString();
  const sellerId = product.sellerId?.trim();

  if (!sellerId) {
    throw new Error('Ürün için sellerId zorunlu.');
  }
  if (!product.imageUrl?.trim()) {
    throw new Error('Ürün görseli zorunlu.');
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    throw new Error('Ürün fiyatı geçerli olmalı.');
  }
  if (!Number.isFinite(product.stock) || product.stock < 0) {
    throw new Error('Ürün stoğu geçerli olmalı.');
  }
  if (!product.sizes?.length) {
    throw new Error('Ürün için en az bir beden seçeneği zorunlu.');
  }

  return stripUndefined({
    ...product,
    sellerId,
    status: product.status ?? 'active',
    source: product.source ?? 'firebase-seller',
    createdAt: product.createdAt ?? now,
    updatedAt: now,
  }) as Product;
}

function sanitizeProductPatch(patch: Partial<Product>) {
  const { id: _id, sellerId: _sellerId, createdAt: _createdAt, source: _source, ...safePatch } = patch;
  return stripUndefined(safePatch);
}

async function postCheckoutCommit(
  endpoint: string,
  token: string,
  payload: { order: Order; sellerOrders: SellerOrder[] },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), checkoutCommitTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Checkout endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return {
      order: result.order as Order,
      sellerOrders: (result.sellerOrders ?? []) as SellerOrder[],
      buyerCredits: result.buyerCredits as BuyerCreditAccount | undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postProductPublish(
  endpoint: string,
  token: string,
  payload: { draft: SellerDraft; listing: GeneratedListing },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), productPublishTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Product publish endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return result.product as Product;
  } finally {
    clearTimeout(timeout);
  }
}

async function getSellerCreditSummary(endpoint: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sellerCreditSummaryTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Seller credit endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return result.sellerCredits as SellerCreditAccount;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBuyerCreditSummary(endpoint: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), buyerCreditSummaryTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Buyer credit endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return result.buyerCredits as BuyerCreditAccount;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBuyerCreditCenter(endpoint: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), buyerCreditSummaryTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Buyer credit center endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return result.center;
  } finally {
    clearTimeout(timeout);
  }
}

async function claimBuyerCampaignReward(
  endpoint: string,
  token: string,
  input: { sellerId: string; campaignId: string },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), buyerRewardTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Buyer campaign reward endpoint failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const result = await response.json();
    return {
      buyerCredits: result.buyerCredits as BuyerCreditAccount,
      campaign: result.campaign as SellerRewardCampaign,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function submitProductReview(
  endpoint: string,
  token: string,
  input: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), buyerRewardTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status === 403 && body.includes('review_requires_purchase')) {
        throw new Error('Yorum yapabilmek için ürünü satın almış olman gerekiyor.');
      }
      if (response.status === 409 && body.includes('review_already_exists')) {
        throw new Error('Bu ürünü daha önce değerlendirdin.');
      }
      throw new Error(`Product review endpoint failed with ${response.status}: ${body}`);
    }

    const result = await response.json();
    return {
      review: result.review as ProductReview,
      fitFeedback: result.fitFeedback as FitFeedback,
      buyerCredits: result.buyerCredits as BuyerCreditAccount,
      reward: result.reward,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function submitFitFeedback(
  endpoint: string,
  token: string,
  input: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), buyerRewardTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status === 403 && body.includes('fit_feedback_requires_purchase')) {
        throw new Error('Fit bilgisi paylaşmak için ürünü satın almış olman gerekiyor.');
      }
      if (response.status === 409 && body.includes('fit_feedback_already_exists')) {
        throw new Error('Bu ürün için fit bilgisini daha önce paylaştın.');
      }
      throw new Error(`Fit feedback endpoint failed with ${response.status}: ${body}`);
    }

    const result = await response.json();
    return {
      fitFeedback: result.fitFeedback as FitFeedback,
      buyerCredits: result.buyerCredits as BuyerCreditAccount,
      reward: result.reward,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function purchaseSellerCreditPackage(
  endpoint: string,
  token: string,
  packageId: SellerCreditPackageId,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sellerCreditPurchaseTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status === 402 && body.includes('seller_credit_limit_exceeded')) {
        throw new Error('Kredi limitin bu paket için yeterli değil.');
      }
      throw new Error(`Seller credit package endpoint failed with ${response.status}: ${body}`);
    }

    const result = await response.json();
    return {
      sellerCredits: result.sellerCredits as SellerCreditAccount,
      package: result.package as SellerCreditPackage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postReturnRequestStatus(
  endpoint: string,
  token: string,
  input: {
    buyerId: string;
    requestId: string;
    status: ReturnRequestStatus;
    decisionNote?: string;
  },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), returnRequestStatusTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status === 403 && body.includes('return_request_not_owned')) {
        throw new Error('Bu iade talebi bu satıcıya ait değil.');
      }
      if (response.status === 404 && body.includes('return_request_not_found')) {
        throw new Error('İade talebi bulunamadı.');
      }
      throw new Error(`Return request status endpoint failed with ${response.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return 'Unable to read response body.';
  }
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => typeof item !== 'undefined')
        .map(([key, item]) => [key, stripUndefined(item)]),
    ) as T;
  }
  return value;
}
