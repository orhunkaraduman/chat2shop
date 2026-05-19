import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ReturnRequest,
  ReturnRequestStatus,
  AppUser,
  BuyerCreditAccount,
  BuyerCreditCenter,
  FitFeedback,
  GeneratedListing,
  Order,
  Product,
  ProductReview,
  SellerCreditAccount,
  SellerCreditPackageId,
  SellerDraft,
  SellerDraftRecord,
  SellerOrder,
  SellerOrderStatus,
  SellerRewardCampaign,
  SellerStore,
  UserDataState,
  UserRole,
} from '@/types';
import { sellerCreditPackages } from '@/data/sellerCredits';
import { generatedListingToProduct } from '@/services/sellerProduct';

import { AppRepositories } from './types';

type LocalAuthUser = AppUser & {
  password: string;
};

const localUsersKey = 'chat2shop.localAuth.users';
const localCurrentUserKey = 'chat2shop.localAuth.currentUserId';
const localSellerCreditAccounts = new Map<string, SellerCreditAccount>();
const localBuyerCreditAccounts = new Map<string, BuyerCreditAccount>();
const localSellerRewardCampaigns = new Map<string, SellerRewardCampaign[]>();

export function createLocalRepositories(): AppRepositories {
  return {
    mode: 'local',
    auth: {
      mode: 'local',
      async getCurrentUser() {
        return getCurrentLocalUser();
      },
      onAuthStateChanged(callback) {
        void getCurrentLocalUser().then(callback);
        return () => undefined;
      },
      async signUp(email: string, password: string, role: UserRole) {
        const users = await readLocalUsers();
        const normalizedEmail = normalizeEmail(email);
        if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
          throw new Error('Bu e-posta adresiyle kayıtlı bir hesap var.');
        }

        const user = createLocalUser(normalizedEmail, password, role);
        await writeLocalUsers([user, ...users]);
        await AsyncStorage.setItem(localCurrentUserKey, user.id);
        return stripPassword(user);
      },
      async signIn(email: string, password: string) {
        const users = await readLocalUsers();
        const normalizedEmail = normalizeEmail(email);
        const user = users.find((item) => normalizeEmail(item.email) === normalizedEmail);
        if (!user || user.password !== password) {
          throw new Error('E-posta veya şifre hatalı.');
        }

        await AsyncStorage.setItem(localCurrentUserKey, user.id);
        return stripPassword(user);
      },
      async signOut() {
        await AsyncStorage.removeItem(localCurrentUserKey);
      },
      async getIdToken() {
        return undefined;
      },
    },
    users: {
      async upsertUser() {
        return undefined;
      },
      async updateStyleProfile() {
        return undefined;
      },
    },
    userData: {
      async getUserData(): Promise<UserDataState | undefined> {
        return undefined;
      },
      async saveUserData() {
        return undefined;
      },
    },
    products: {
      async listProducts() {
        return [];
      },
      async listSellerProducts() {
        return [];
      },
      async createProduct(product: Product) {
        return product;
      },
      async publishProduct({ draft, listing }: { draft: SellerDraft; listing: GeneratedListing }) {
        return generatedListingToProduct(
          { ...listing, status: 'published' },
          draft,
          'demo-seller',
          'local-seller',
        );
      },
      async updateProduct() {
        return undefined;
      },
      async updateStatus() {
        return undefined;
      },
      async deleteProduct() {
        return undefined;
      },
    },
    orders: {
      async listOrders() {
        return [];
      },
      async createOrder(_userId: string, order: Order) {
        return order;
      },
      async updateOrder() {
        return undefined;
      },
    },
    checkout: {
      async createCheckout({ order, sellerOrders }) {
        return { order, sellerOrders };
      },
    },
    sellerDrafts: {
      async getCurrentDraft() {
        return undefined;
      },
      async saveCurrentDraft(_userId: string, _record: SellerDraftRecord) {
        return undefined;
      },
    },
    sellerCredits: {
      async getAccount(sellerId: string) {
        return getLocalSellerCreditAccount(sellerId);
      },
      async purchasePackage(sellerId: string, packageId: SellerCreditPackageId) {
        const selectedPackage = sellerCreditPackages.find((item) => item.id === packageId);
        if (!selectedPackage) {
          throw new Error('Geçersiz AI kredi paketi.');
        }

        const account = getLocalSellerCreditAccount(sellerId);
        const nextDebt = account.creditDebtAmount + selectedPackage.amountTRY;
        if (nextDebt > account.creditLimitAmount) {
          throw new Error('Kredi limitin bu paket için yeterli değil.');
        }

        const now = new Date().toISOString();
        const nextAccount: SellerCreditAccount = {
          ...account,
          paidCredits: account.paidCredits + selectedPackage.credits,
          totalGrantedCredits: account.totalGrantedCredits + selectedPackage.credits,
          creditDebtAmount: nextDebt,
          updatedAt: now,
        };
        localSellerCreditAccounts.set(sellerId, nextAccount);

        return {
          sellerCredits: nextAccount,
          package: selectedPackage,
        };
      },
    },
    buyerCredits: {
      async getAccount(buyerId: string) {
        return getLocalBuyerCreditAccount(buyerId);
      },
      async getCenter(buyerId: string) {
        const account = getLocalBuyerCreditAccount(buyerId);
        const campaigns = Array.from(localSellerRewardCampaigns.values())
          .flat()
          .filter((campaign) => campaign.kind === 'seller_reward_campaign' && campaign.status === 'active');
        const center: BuyerCreditCenter = {
          account,
          giftCredits: [],
          tasks: campaigns
            .filter((campaign) => campaign.type === 'store_promo')
            .map((campaign) => ({
              id: `campaign-${campaign.id}`,
              type: 'campaign',
              title: campaign.title,
              description: campaign.description,
              rewardCredits: campaign.rewardCredits,
              actionLabel: 'Jetonu al',
              sellerId: campaign.sellerId,
              campaignId: campaign.id,
            })),
          campaigns: campaigns.filter((campaign) => campaign.type === 'store_promo'),
          ledger: [],
          earningRules: [
            { id: 'purchase', title: 'Alışveriş yap', description: 'Her 100 TL alışveriş için jeton kazan.', rewardCredits: 10 },
            { id: 'review', title: 'Yorum yaz', description: 'Satın aldığın ürünleri değerlendir.', rewardCredits: 3 },
            { id: 'fit_feedback', title: 'Fit bilgisi paylaş', description: 'Beden duruşunu paylaş.', rewardCredits: 2 },
            { id: 'campaign', title: 'Kampanya al', description: 'Mağaza promosyonlarından jeton kazan.', rewardCredits: 5 },
            { id: 'sponsored_try_on', title: 'Sponsorlu Kabin', description: 'Mağazanın karşıladığı Kabin denemelerini kullan.', rewardCredits: 2 },
          ],
        };
        return center;
      },
      async claimCampaignReward(buyerId: string, input: { sellerId: string; campaignId: string }) {
        const account = getLocalBuyerCreditAccount(buyerId);
        const campaign = localSellerRewardCampaigns.get(input.sellerId)?.find((item) => item.id === input.campaignId);
        if (!campaign) throw new Error('Kampanya bulunamadı.');
        const nextAccount: BuyerCreditAccount = {
          ...account,
          freeCredits: account.freeCredits + campaign.rewardCredits,
          totalGrantedCredits: account.totalGrantedCredits + campaign.rewardCredits,
          updatedAt: new Date().toISOString(),
        };
        localBuyerCreditAccounts.set(buyerId, nextAccount);
        return { buyerCredits: nextAccount, campaign };
      },
      async submitProductReview(buyerId: string, input: Omit<ProductReview, 'id' | 'userId' | 'createdAt'>) {
        const now = new Date().toISOString();
        const review: ProductReview = {
          ...input,
          id: `review-${Date.now()}`,
          userId: buyerId,
          createdAt: now,
        };
        const fitFeedback: FitFeedback = {
          id: `fit-${Date.now()}`,
          productId: input.productId,
          userId: buyerId,
          usualSize: input.sizeBought,
          boughtSize: input.sizeBought,
          result: input.fitResult,
          createdAt: now,
        };
        return {
          review,
          fitFeedback,
          buyerCredits: getLocalBuyerCreditAccount(buyerId),
        };
      },
      async submitFitFeedback(buyerId: string, input: Omit<FitFeedback, 'id' | 'userId' | 'createdAt'>) {
        const now = new Date().toISOString();
        const fitFeedback: FitFeedback = {
          ...input,
          id: `fit-${Date.now()}`,
          userId: buyerId,
          createdAt: now,
        };
        return {
          fitFeedback,
          buyerCredits: getLocalBuyerCreditAccount(buyerId),
        };
      },
      async spendTryOnCredit(buyerId: string) {
        const account = getLocalBuyerCreditAccount(buyerId);
        if (account.freeCredits + account.paidCredits < 2) {
          throw new Error('Kabin jetonun yetersiz.');
        }
        const now = new Date().toISOString();
        const freeSpend = Math.min(account.freeCredits, 2);
        const paidSpend = 2 - freeSpend;
        const nextAccount: BuyerCreditAccount = {
          ...account,
          freeCredits: account.freeCredits - freeSpend,
          paidCredits: account.paidCredits - paidSpend,
          totalUsedCredits: account.totalUsedCredits + 2,
          updatedAt: now,
        };
        localBuyerCreditAccounts.set(buyerId, nextAccount);
        return nextAccount;
      },
    },
    sellerRewardCampaigns: {
      async listCampaigns(sellerId: string) {
        return (localSellerRewardCampaigns.get(sellerId) ?? []).map((campaign) => ({
          ...campaign,
          kind: 'seller_reward_campaign' as const,
        }));
      },
      async saveCampaign(campaign: SellerRewardCampaign) {
        const normalized = { ...campaign, kind: 'seller_reward_campaign' as const };
        const campaigns = localSellerRewardCampaigns.get(normalized.sellerId) ?? [];
        localSellerRewardCampaigns.set(normalized.sellerId, [
          normalized,
          ...campaigns.filter((item) => item.id !== normalized.id),
        ]);
        return normalized;
      },
      async archiveCampaign(sellerId: string, campaignId: string) {
        const campaigns = localSellerRewardCampaigns.get(sellerId) ?? [];
        localSellerRewardCampaigns.set(
          sellerId,
          campaigns.map((campaign) =>
            campaign.id === campaignId
              ? { ...campaign, status: 'archived', updatedAt: new Date().toISOString() }
              : campaign,
          ),
        );
      },
    },
    sellerStores: {
      async getStore() {
        return undefined;
      },
      async saveStore(store: SellerStore) {
        return store;
      },
    },
    sellerOrders: {
      async listOrders() {
        return [];
      },
      async listBuyerOrders() {
        return [];
      },
      async createOrder(order: SellerOrder) {
        return order;
      },
      async updateStatus(_sellerId: string, _orderId: string, _status: SellerOrderStatus) {
        return undefined;
      },
      async updateOrder() {
        return undefined;
      },
    },
    returnRequests: {
      async listBuyerRequests() {
        return [];
      },
      async listSellerRequests() {
        return [];
      },
      async createRequest(_buyerId: string, request: ReturnRequest) {
        return request;
      },
      async updateRequestStatus(
        _buyerId: string,
        _requestId: string,
        _status: ReturnRequestStatus,
      ) {
        return undefined;
      },
    },
    reviews: {
      async listReviews() {
        return [];
      },
      async addReview(review: ProductReview) {
        return review;
      },
    },
    fitFeedback: {
      async listFeedback() {
        return [];
      },
      async addFeedback(feedback: FitFeedback) {
        return feedback;
      },
    },
    searchAnalytics: {
      async createRecord() {
        return undefined;
      },
    },
  };
}

function getLocalSellerCreditAccount(sellerId: string): SellerCreditAccount {
  const existing = localSellerCreditAccounts.get(sellerId);
  if (existing) return existing;

  const account = createLocalSellerCreditAccount(sellerId);
  localSellerCreditAccounts.set(sellerId, account);
  return account;
}

function createLocalSellerCreditAccount(sellerId: string): SellerCreditAccount {
  const now = new Date().toISOString();
  return {
    sellerId,
    freeCredits: 20,
    paidCredits: 0,
    totalGrantedCredits: 20,
    totalUsedCredits: 0,
    creditDebtAmount: 0,
    creditLimitAmount: 1000,
    welcomeGrantApplied: true,
    createdAt: now,
    updatedAt: now,
  };
}

function getLocalBuyerCreditAccount(buyerId: string): BuyerCreditAccount {
  const existing = localBuyerCreditAccounts.get(buyerId);
  if (existing) return existing;

  const account = createLocalBuyerCreditAccount(buyerId);
  localBuyerCreditAccounts.set(buyerId, account);
  return account;
}

function createLocalBuyerCreditAccount(buyerId: string): BuyerCreditAccount {
  const now = new Date().toISOString();
  return {
    buyerId,
    freeCredits: 10,
    paidCredits: 0,
    totalGrantedCredits: 10,
    totalUsedCredits: 0,
    welcomeGrantApplied: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createLocalUser(email: string, password: string, role: UserRole): LocalAuthUser {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    email,
    password,
    role,
    createdAt: now,
    updatedAt: now,
  };
}

async function getCurrentLocalUser() {
  const currentUserId = await AsyncStorage.getItem(localCurrentUserKey);
  if (!currentUserId) return undefined;

  const user = (await readLocalUsers()).find((item) => item.id === currentUserId);
  return user ? stripPassword(user) : undefined;
}

async function readLocalUsers() {
  try {
    const value = await AsyncStorage.getItem(localUsersKey);
    if (!value) return [];
    return JSON.parse(value) as LocalAuthUser[];
  } catch {
    return [];
  }
}

async function writeLocalUsers(users: LocalAuthUser[]) {
  await AsyncStorage.setItem(localUsersKey, JSON.stringify(users));
}

function stripPassword(user: LocalAuthUser): AppUser {
  const { password: _password, ...appUser } = user;
  return appUser;
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('tr-TR');
}
