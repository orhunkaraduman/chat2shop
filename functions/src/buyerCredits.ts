import { logger } from 'firebase-functions';

import { getDb } from './admin';
import { HttpError } from './security';
import type {
  BuyerCreditAccount,
  BuyerCreditCenter,
  BuyerCreditLedgerEntry,
  BuyerCreditLedgerType,
  SellerRewardCampaign,
  SellerRewardCampaignType,
} from './types';

type UserRecord = {
  email?: string;
  role?: string;
};

const DEFAULT_BUYER_WELCOME_CREDITS = 10;
const DEFAULT_TRY_ON_CREDIT_COST = 2;
const DEFAULT_PURCHASE_REWARD_UNIT_TRY = 100;
const DEFAULT_PURCHASE_REWARD_CREDITS_PER_UNIT = 10;
const DEFAULT_REVIEW_REWARD_CREDITS = 3;
const DEFAULT_FIT_FEEDBACK_REWARD_CREDITS = 2;
const DEFAULT_STORE_PROMO_REWARD_CREDITS = 5;

type BuyerCreditRewardInput = {
  type: BuyerCreditLedgerType;
  creditAmount: number;
  note: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

type ProductRecord = {
  id?: string;
  title?: string;
  sellerId?: string;
  seller?: string;
  imageUrl?: string;
  category?: string;
};

type OrderRecord = {
  id?: string;
  sellerId?: string;
  items?: Array<{
    productId?: string;
    title?: string;
    quantity?: number;
    category?: string;
  }>;
  total?: number;
  createdAt?: string;
};

type ProductReviewInput = {
  productId: string;
  rating: number;
  text: string;
  sizeBought: string;
  fitResult: 'tight' | 'true' | 'loose';
};

type FitFeedbackInput = {
  productId: string;
  usualSize: string;
  boughtSize: string;
  result: 'tight' | 'true' | 'loose';
};

type CampaignContext = {
  productId?: string;
  productIds?: string[];
  category?: string;
  categories?: string[];
  orderTotal?: number;
};

type RewardReversalReturnRequest = {
  id: string;
  buyerId: string;
  sellerId: string;
  buyerOrderId: string;
  sellerOrderId: string;
  productId: string;
};

export function getBuyerWelcomeCreditAmount() {
  return getPositiveNumberEnv('BUYER_WELCOME_AI_CREDITS', DEFAULT_BUYER_WELCOME_CREDITS);
}

export function getTryOnCreditCost() {
  return getPositiveNumberEnv('TRY_ON_CREDIT_COST', DEFAULT_TRY_ON_CREDIT_COST);
}

export function getPurchaseRewardUnitTRY() {
  return getPositiveNumberEnv('BUYER_PURCHASE_REWARD_UNIT_TRY', DEFAULT_PURCHASE_REWARD_UNIT_TRY);
}

export function getPurchaseRewardCreditAmount(eligibleAmountTRY?: number) {
  const creditsPerUnit = getPositiveNumberEnv(
    'BUYER_PURCHASE_REWARD_CREDITS_PER_100_TRY',
    DEFAULT_PURCHASE_REWARD_CREDITS_PER_UNIT,
  );
  if (!Number.isFinite(eligibleAmountTRY)) {
    return creditsPerUnit;
  }
  const unit = getPurchaseRewardUnitTRY();
  const units = Math.floor(Math.max(0, Number(eligibleAmountTRY)) / unit);
  return units * creditsPerUnit;
}

export function getReviewRewardCreditAmount() {
  return getPositiveNumberEnv('BUYER_REVIEW_REWARD_CREDITS', DEFAULT_REVIEW_REWARD_CREDITS);
}

export function getFitFeedbackRewardCreditAmount() {
  return getPositiveNumberEnv('BUYER_FIT_FEEDBACK_REWARD_CREDITS', DEFAULT_FIT_FEEDBACK_REWARD_CREDITS);
}

export function getStorePromoRewardCreditAmount() {
  return getPositiveNumberEnv('BUYER_STORE_PROMO_REWARD_CREDITS', DEFAULT_STORE_PROMO_REWARD_CREDITS);
}

export async function getBuyerCreditSummary(uid: string): Promise<BuyerCreditAccount> {
  await assertBuyerAccount(uid);
  return ensureBuyerCreditAccount(uid);
}

export async function getBuyerCreditCenter(uid: string): Promise<BuyerCreditCenter> {
  await assertBuyerAccount(uid);
  const db = getDb();
  const account = await ensureBuyerCreditAccount(uid);
  const [ledger, campaigns, orders] = await Promise.all([
    loadBuyerCreditLedger(uid),
    loadActiveRewardCampaigns(),
    loadRecentBuyerOrders(uid),
  ]);
  const tasks = await buildBuyerCreditTasks(uid, orders, campaigns);

  return {
    account,
    giftCredits: ledger.filter((item) => item.creditAmount > 0),
    tasks,
    campaigns: campaigns.filter((campaign) => campaign.type === 'store_promo'),
    ledger,
    earningRules: [
      {
        id: 'purchase',
        title: 'Alışveriş yap',
        description: `Tamamlanan alışverişlerinde her ${getPurchaseRewardUnitTRY()} TL için jeton kazan.`,
        rewardCredits: getPurchaseRewardCreditAmount(),
      },
      {
        id: 'review',
        title: 'Yorum yaz',
        description: 'Satın aldığın ürünleri değerlendir, mağaza ödülü varsa jeton kazan.',
        rewardCredits: getReviewRewardCreditAmount(),
      },
      {
        id: 'fit_feedback',
        title: 'Fit bilgisi paylaş',
        description: 'Satın aldığın ürünün bedeni dar, tam veya bol mu söyle.',
        rewardCredits: getFitFeedbackRewardCreditAmount(),
      },
      {
        id: 'campaign',
        title: 'Mağaza kampanyası al',
        description: 'Aktif mağaza promosyonlarından sponsorlu jeton kazan.',
        rewardCredits: getStorePromoRewardCreditAmount(),
      },
      {
        id: 'sponsored_try_on',
        title: 'Sponsorlu Kabin dene',
        description: 'Bazı mağazalar Kabin denemesi maliyetini senin yerine karşılar.',
        rewardCredits: getTryOnCreditCost(),
      },
    ],
  };
}

async function loadBuyerCreditLedger(uid: string) {
  try {
    const snapshot = await getDb().collection('buyerCredits').doc(uid).collection('ledger').orderBy('createdAt', 'desc').limit(20).get();
    return snapshot.docs.map((item) => normalizeLedger(item.data(), uid));
  } catch (error) {
    logger.warn('Buyer credit ledger could not be loaded; continuing with empty ledger.', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    return [] as BuyerCreditLedgerEntry[];
  }
}

async function loadActiveRewardCampaigns() {
  try {
    const snapshot = await getDb().collectionGroup('items').where('kind', '==', 'seller_reward_campaign').limit(80).get();
    return snapshot.docs
      .map((item) => normalizeCampaign(item.data(), item.id))
      .filter((campaign) => isCampaignActive(campaign));
  } catch (error) {
    logger.warn('Reward campaigns could not be loaded for buyer credit center; continuing without campaigns.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [] as SellerRewardCampaign[];
  }
}

async function loadRecentBuyerOrders(uid: string) {
  try {
    const snapshot = await getDb().collection('orders').doc(uid).collection('items').orderBy('createdAt', 'desc').limit(8).get();
    return snapshot.docs.map((item) => item.data() as OrderRecord);
  } catch (error) {
    logger.warn('Buyer orders could not be loaded for credit tasks; continuing without order tasks.', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    return [] as OrderRecord[];
  }
}

export async function grantPurchaseReward(
  uid: string,
  orderId: string,
  metadata: Record<string, unknown> = {},
): Promise<BuyerCreditAccount> {
  await assertBuyerAccount(uid);
  const eligibleAmountTRY = getPurchaseRewardEligibleAmountTRY(metadata);
  const creditAmount = getPurchaseRewardCreditAmount(eligibleAmountTRY);
  if (creditAmount <= 0) {
    return ensureBuyerCreditAccount(uid);
  }
  return grantBuyerCredits(uid, {
    type: 'purchase_reward',
    creditAmount,
    note: `Alışveriş ödülü: her ${getPurchaseRewardUnitTRY()} TL için ${getPurchaseRewardCreditAmount()} jeton`,
    idempotencyKey: `purchase-${orderId}`,
    metadata: {
      orderId,
      eligibleAmountTRY,
      rewardUnitTRY: getPurchaseRewardUnitTRY(),
      rewardCreditsPerUnit: getPurchaseRewardCreditAmount(),
      awardedUnits: Math.floor(eligibleAmountTRY / getPurchaseRewardUnitTRY()),
      ...metadata,
    },
  });
}

export async function grantSellerPurchaseRewards(
  uid: string,
  sellerOrders: OrderRecord[],
): Promise<BuyerCreditAccount | undefined> {
  await assertBuyerAccount(uid);
  let latestAccount: BuyerCreditAccount | undefined;

  for (const sellerOrder of sellerOrders) {
    if (!sellerOrder.id || !sellerOrder.sellerId) continue;
    const productIds = (sellerOrder.items ?? []).map((item) => item.productId).filter(isNonEmptyStringValue);
    const context = await enrichCampaignContext({
      productIds,
      categories: (sellerOrder.items ?? []).map((item) => item.category).filter(isNonEmptyStringValue),
      orderTotal: sellerOrder.total,
    });
    const campaign = await findBestCampaign(sellerOrder.sellerId, 'purchase_reward', context);
    if (!campaign) continue;
    const result = await grantCampaignReward(
      uid,
      sellerOrder.sellerId,
      campaign.id,
      'purchase_reward',
      `purchase-${sellerOrder.id}`,
      {
        sellerOrderId: sellerOrder.id,
        total: sellerOrder.total,
        productIds,
        categories: context.categories,
      },
    );
    latestAccount = result.buyerCredits;
  }

  return latestAccount;
}

export async function claimBuyerCampaignReward(
  uid: string,
  body: unknown,
): Promise<{ buyerCredits: BuyerCreditAccount; campaign: SellerRewardCampaign; ledgerEntry?: BuyerCreditLedgerEntry }> {
  await assertBuyerAccount(uid);
  if (!isRecord(body)) throw new HttpError(400, 'Request body must be an object.');
  const sellerId = getNonEmptyString(body.sellerId, 'sellerId');
  const campaignId = getNonEmptyString(body.campaignId, 'campaignId');
  return grantCampaignReward(uid, sellerId, campaignId, 'store_campaign_reward', `store-promo-${campaignId}`);
}

export async function submitProductReviewWithReward(
  uid: string,
  body: unknown,
): Promise<{
  review: Record<string, unknown>;
  fitFeedback: Record<string, unknown>;
  buyerCredits: BuyerCreditAccount;
  reward?: BuyerCreditLedgerEntry;
}> {
  await assertBuyerAccount(uid);
  const input = validateProductReviewInput(body);
  const db = getDb();
  const productRef = db.collection('products').doc(input.productId);
  const productSnapshot = await productRef.get();
  if (!productSnapshot.exists) {
    throw new HttpError(404, 'product_not_found');
  }

  const product = productSnapshot.data() as ProductRecord;
  const sellerId = product.sellerId;
  if (!sellerId) {
    throw new HttpError(409, 'product_seller_missing');
  }

  const purchase = await findPurchasedProduct(uid, input.productId);
  if (!purchase) {
    throw new HttpError(403, 'review_requires_purchase');
  }

  const existingReview = await productRef.collection('reviews').where('userId', '==', uid).limit(1).get();
  if (!existingReview.empty) {
    throw new HttpError(409, 'review_already_exists');
  }

  const now = new Date().toISOString();
  const reviewId = `review-${uid}`;
  const fitId = `fit-${uid}`;
  const review = {
    id: reviewId,
    productId: input.productId,
    userId: uid,
    rating: input.rating,
    text: input.text,
    sizeBought: input.sizeBought,
    fitResult: input.fitResult,
    createdAt: now,
  };
  const fitFeedback = {
    id: fitId,
    productId: input.productId,
    userId: uid,
    usualSize: input.sizeBought,
    boughtSize: input.sizeBought,
    result: input.fitResult,
    createdAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const reviewRef = productRef.collection('reviews').doc(reviewId);
    const fitRef = productRef.collection('fitFeedback').doc(fitId);
    const reviewDoc = await transaction.get(reviewRef);
    if (reviewDoc.exists) {
      throw new HttpError(409, 'review_already_exists');
    }
    transaction.set(reviewRef, stripUndefined(review));
    transaction.set(fitRef, stripUndefined(fitFeedback));
  });

  let reward: BuyerCreditLedgerEntry | undefined;
  let buyerCredits = await ensureBuyerCreditAccount(uid);
  const campaign = await findBestCampaign(sellerId, 'review_reward', {
    productId: input.productId,
    category: product.category,
  });
  if (campaign) {
    const result = await grantCampaignReward(
      uid,
      sellerId,
      campaign.id,
      'review_reward',
      `review-${input.productId}`,
      {
        productId: input.productId,
        productTitle: product.title ?? input.productId,
        orderId: purchase.orderId,
      },
    );
    buyerCredits = result.buyerCredits;
    reward = result.ledgerEntry;
  }

  return {
    review,
    fitFeedback,
    buyerCredits,
    reward,
  };
}

export async function submitFitFeedbackWithReward(
  uid: string,
  body: unknown,
): Promise<{
  fitFeedback: Record<string, unknown>;
  buyerCredits: BuyerCreditAccount;
  reward?: BuyerCreditLedgerEntry;
}> {
  await assertBuyerAccount(uid);
  const input = validateFitFeedbackInput(body);
  const db = getDb();
  const productRef = db.collection('products').doc(input.productId);
  const productSnapshot = await productRef.get();
  if (!productSnapshot.exists) {
    throw new HttpError(404, 'product_not_found');
  }

  const product = productSnapshot.data() as ProductRecord;
  const sellerId = product.sellerId;
  if (!sellerId) {
    throw new HttpError(409, 'product_seller_missing');
  }

  const purchase = await findPurchasedProduct(uid, input.productId);
  if (!purchase) {
    throw new HttpError(403, 'fit_feedback_requires_purchase');
  }

  const now = new Date().toISOString();
  const fitId = `fit-${uid}`;
  const fitFeedback = {
    id: fitId,
    productId: input.productId,
    userId: uid,
    usualSize: input.usualSize,
    boughtSize: input.boughtSize,
    result: input.result,
    createdAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const fitRef = productRef.collection('fitFeedback').doc(fitId);
    const fitDoc = await transaction.get(fitRef);
    if (fitDoc.exists) {
      throw new HttpError(409, 'fit_feedback_already_exists');
    }
    transaction.set(fitRef, stripUndefined(fitFeedback));
  });

  let reward: BuyerCreditLedgerEntry | undefined;
  let buyerCredits = await ensureBuyerCreditAccount(uid);
  const campaign = await findBestCampaign(sellerId, 'fit_feedback_reward', {
    productId: input.productId,
    category: product.category,
  });
  if (campaign) {
    const result = await grantCampaignReward(
      uid,
      sellerId,
      campaign.id,
      'fit_feedback_reward',
      `fit-feedback-${input.productId}`,
      {
        productId: input.productId,
        productTitle: product.title ?? input.productId,
        orderId: purchase.orderId,
      },
    );
    buyerCredits = result.buyerCredits;
    reward = result.ledgerEntry;
  }

  return {
    fitFeedback,
    buyerCredits,
    reward,
  };
}

export async function spendTryOnCredit(
  uid: string,
  metadata: Record<string, unknown> = {},
): Promise<BuyerCreditAccount> {
  await assertBuyerAccount(uid);

  const cost = getTryOnCreditCost();
  const db = getDb();
  const accountRef = db.collection('buyerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc();

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const snapshot = await transaction.get(accountRef);
    const account = snapshot.exists
      ? normalizeAccount(snapshot.data(), uid)
      : createWelcomeAccount(uid, now);

    if (getAvailableCredits(account) < cost) {
      throw new HttpError(402, 'insufficient_buyer_ai_credits');
    }

    let remainingCost = cost;
    const freeSpend = Math.min(account.freeCredits, remainingCost);
    remainingCost -= freeSpend;
    const paidSpend = Math.min(account.paidCredits, remainingCost);
    remainingCost -= paidSpend;

    if (remainingCost > 0) {
      throw new HttpError(402, 'insufficient_buyer_ai_credits');
    }

    const nextAccount: BuyerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits - freeSpend),
      paidCredits: roundCredit(account.paidCredits - paidSpend),
      totalUsedCredits: roundCredit(account.totalUsedCredits + cost),
      updatedAt: now,
    };

    if (!snapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }

    const ledgerEntry: BuyerCreditLedgerEntry = {
      id: ledgerRef.id,
      buyerId: uid,
      type: 'try_on_spent',
      creditAmount: -cost,
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note: 'AI try-on preview generation',
      metadata: stripUndefined(metadata),
      createdAt: now,
    };

    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));

    logger.info('Spent buyer try-on credit.', {
      uid,
      cost,
      freeCredits: nextAccount.freeCredits,
      paidCredits: nextAccount.paidCredits,
    });

    return nextAccount;
  });
}

export async function sponsorTryOnIfAvailable(
  uid: string,
  productId: string,
  jobId: string,
  metadata: Record<string, unknown> = {},
): Promise<{
  sponsored: boolean;
  buyerCredits?: BuyerCreditAccount;
  campaign?: SellerRewardCampaign;
}> {
  await assertBuyerAccount(uid);

  const db = getDb();
  const productSnapshot = await db.collection('products').doc(productId).get();
  const product = productSnapshot.data() as ProductRecord | undefined;
  if (!product?.sellerId) {
    return { sponsored: false };
  }

  const campaign = await findBestCampaign(product.sellerId, 'sponsored_try_on', {
    productId,
    category: product.category,
  });
  if (!campaign) {
    return { sponsored: false };
  }

  try {
    const result = await spendSponsoredTryOnCampaign(
      uid,
      product.sellerId,
      campaign.id,
      `try-on-${jobId}`,
      {
        jobId,
        productId,
        productTitle: product.title ?? productId,
        ...metadata,
      },
    );
    return {
      sponsored: true,
      buyerCredits: result.buyerCredits,
      campaign: result.campaign,
    };
  } catch (error) {
    if (error instanceof HttpError && ['campaign_budget_exceeded', 'campaign_user_limit_reached', 'campaign_not_active'].includes(error.message)) {
      return { sponsored: false };
    }
    throw error;
  }
}

export async function refundSponsoredTryOnCampaign(
  uid: string,
  input: {
    jobId: string;
    sellerId?: string;
    campaignId?: string;
    reason: string;
    error?: string;
  },
) {
  if (!input.sellerId || !input.campaignId) return;

  const db = getDb();
  const sellerId = input.sellerId;
  const campaignId = input.campaignId;
  const campaignRef = db
    .collection('sellerRewardCampaigns')
    .doc(sellerId)
    .collection('items')
    .doc(campaignId);
  const claimRef = campaignRef.collection('claims').doc(`sponsored-try-on-${uid}-${input.jobId}`);
  const reversalRef = db.collection('buyerCredits').doc(uid).collection('ledger').doc(`sponsored-try-on-refund-${input.jobId}`);

  await db.runTransaction(async (transaction) => {
    const [campaignSnapshot, reversalSnapshot] = await Promise.all([
      transaction.get(campaignRef),
      transaction.get(reversalRef),
    ]);
    if (!campaignSnapshot.exists || reversalSnapshot.exists) return;

    const campaign = normalizeCampaign(campaignSnapshot.data(), campaignId);
    const cost = Math.max(1, campaign.rewardCredits || getTryOnCreditCost());
    const now = new Date().toISOString();
    transaction.update(campaignRef, {
      spentCredits: Math.max(0, campaign.spentCredits - cost),
      updatedAt: now,
    });
    transaction.set(claimRef, stripUndefined({
      status: 'reversed',
      reversedAt: now,
      reverseReason: input.reason,
      reverseError: input.error,
    }), { merge: true });
    transaction.set(reversalRef, {
      id: reversalRef.id,
      buyerId: uid,
      type: 'reward_reversed',
      creditAmount: 0,
      balanceAfter: { freeCredits: 0, paidCredits: 0 },
      note: 'Sponsorlu Kabin maliyeti mağaza kampanyasına iade edildi.',
      metadata: stripUndefined({
        jobId: input.jobId,
        sellerId,
        campaignId,
        reason: input.reason,
        error: input.error,
      }),
      createdAt: now,
    } satisfies BuyerCreditLedgerEntry);
  });
}

export async function reverseRewardsForReturnRequest(
  request: RewardReversalReturnRequest,
): Promise<{ buyerCredits?: BuyerCreditAccount; reversedCount: number }> {
  await assertBuyerAccount(request.buyerId);

  const db = getDb();
  const ledgerCollection = db.collection('buyerCredits').doc(request.buyerId).collection('ledger');
  const [productLedgerSnapshot, sellerOrderLedgerSnapshot] = await Promise.all([
    ledgerCollection.where('metadata.productId', '==', request.productId).limit(50).get(),
    ledgerCollection.where('metadata.sellerOrderId', '==', request.sellerOrderId).limit(50).get(),
  ]);
  const candidateDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  [...productLedgerSnapshot.docs, ...sellerOrderLedgerSnapshot.docs].forEach((doc) => {
    const ledger = doc.data() as BuyerCreditLedgerEntry;
    if (isReturnReversibleLedger(ledger, request)) {
      candidateDocs.set(doc.id, doc);
    }
  });

  let latestAccount: BuyerCreditAccount | undefined;
  let reversedCount = 0;
  for (const sourceDoc of candidateDocs.values()) {
    const result = await reverseSingleRewardLedger(request, sourceDoc);
    if (result.reversed) reversedCount += 1;
    if (result.buyerCredits) latestAccount = result.buyerCredits;
  }

  return { buyerCredits: latestAccount, reversedCount };
}

export async function refundTryOnCredit(
  uid: string,
  metadata: Record<string, unknown> = {},
): Promise<BuyerCreditAccount> {
  await assertBuyerAccount(uid);

  const cost = getTryOnCreditCost();
  const db = getDb();
  const accountRef = db.collection('buyerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc();

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const snapshot = await transaction.get(accountRef);
    const account = snapshot.exists
      ? normalizeAccount(snapshot.data(), uid)
      : createWelcomeAccount(uid, now);

    const nextAccount: BuyerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits + cost),
      totalUsedCredits: roundCredit(Math.max(0, account.totalUsedCredits - cost)),
      updatedAt: now,
    };

    if (!snapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }

    const ledgerEntry: BuyerCreditLedgerEntry = {
      id: ledgerRef.id,
      buyerId: uid,
      type: 'try_on_refund',
      creditAmount: cost,
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note: 'AI try-on preview refund',
      metadata: stripUndefined(metadata),
      createdAt: now,
    };

    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));

    logger.info('Refunded buyer try-on credit.', {
      uid,
      cost,
      freeCredits: nextAccount.freeCredits,
      paidCredits: nextAccount.paidCredits,
    });

    return nextAccount;
  });
}

async function reverseSingleRewardLedger(
  request: RewardReversalReturnRequest,
  sourceDoc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<{ buyerCredits?: BuyerCreditAccount; reversed: boolean }> {
  const db = getDb();
  const accountRef = db.collection('buyerCredits').doc(request.buyerId);
  const source = sourceDoc.data() as BuyerCreditLedgerEntry;
  const sourceMetadata = isRecord(source.metadata) ? source.metadata : {};
  const reversalRef = accountRef.collection('ledger').doc(`reward-reversal-${request.id}-${sourceDoc.id}`);
  const campaignId = getOptionalString(sourceMetadata.campaignId);
  const sellerId = getOptionalString(sourceMetadata.sellerId);
  const campaignRef = campaignId && sellerId
    ? db.collection('sellerRewardCampaigns').doc(sellerId).collection('items').doc(campaignId)
    : undefined;

  return db.runTransaction(async (transaction) => {
    const accountSnapshotPromise = transaction.get(accountRef);
    const reversalSnapshotPromise = transaction.get(reversalRef);
    const campaignSnapshotPromise = campaignRef ? transaction.get(campaignRef) : undefined;
    const [accountSnapshot, reversalSnapshot, campaignSnapshot] = await Promise.all([
      accountSnapshotPromise,
      reversalSnapshotPromise,
      campaignSnapshotPromise,
    ]);

    const now = new Date().toISOString();
    const account = accountSnapshot.exists
      ? normalizeAccount(accountSnapshot.data(), request.buyerId)
      : createWelcomeAccount(request.buyerId, now);
    if (reversalSnapshot.exists) {
      return { buyerCredits: account, reversed: false };
    }

    const requestedAmount = Math.max(0, Number(source.creditAmount) || 0);
    const availableAmount = Math.max(0, account.freeCredits + account.paidCredits);
    const reversalAmount = Math.min(requestedAmount, availableAmount);
    const freeReduction = Math.min(account.freeCredits, reversalAmount);
    const paidReduction = Math.max(0, reversalAmount - freeReduction);
    const nextAccount: BuyerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits - freeReduction),
      paidCredits: roundCredit(account.paidCredits - paidReduction),
      totalGrantedCredits: roundCredit(Math.max(0, account.totalGrantedCredits - requestedAmount)),
      updatedAt: now,
    };

    const reversalEntry: BuyerCreditLedgerEntry = {
      id: reversalRef.id,
      buyerId: request.buyerId,
      type: 'reward_reversed',
      creditAmount: -roundCredit(reversalAmount),
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note: 'İade sonrası kazanılan jeton geri alındı.',
      metadata: stripUndefined({
        returnRequestId: request.id,
        buyerOrderId: request.buyerOrderId,
        sellerOrderId: request.sellerOrderId,
        productId: request.productId,
        sellerId: request.sellerId,
        sourceLedgerId: sourceDoc.id,
        sourceLedgerType: source.type,
        requestedCreditAmount: requestedAmount,
        reversedCreditAmount: reversalAmount,
      }),
      createdAt: now,
    };

    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(reversalRef, stripUndefined(reversalEntry));

    if (campaignRef && campaignSnapshot?.exists) {
      const campaign = normalizeCampaign(campaignSnapshot.data(), campaignSnapshot.id);
      transaction.set(campaignRef, stripUndefined({
        ...campaign,
        spentCredits: Math.max(0, campaign.spentCredits - requestedAmount),
        updatedAt: now,
      }), { merge: true });
      const claimId = getCampaignClaimIdForSource(request.buyerId, source.type, request);
      if (claimId) {
        transaction.set(campaignRef.collection('claims').doc(claimId), {
          status: 'reversed',
          reversedAt: now,
          returnRequestId: request.id,
        }, { merge: true });
      }
    }

    return { buyerCredits: nextAccount, reversed: true };
  });
}

async function grantBuyerCredits(
  uid: string,
  input: BuyerCreditRewardInput,
): Promise<BuyerCreditAccount> {
  const db = getDb();
  const accountRef = db.collection('buyerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc(input.idempotencyKey);

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const [accountSnapshot, ledgerSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(ledgerRef),
    ]);
    const account = accountSnapshot.exists
      ? normalizeAccount(accountSnapshot.data(), uid)
      : createWelcomeAccount(uid, now);

    if (ledgerSnapshot.exists) {
      return account;
    }

    const nextAccount: BuyerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits + input.creditAmount),
      totalGrantedCredits: roundCredit(account.totalGrantedCredits + input.creditAmount),
      updatedAt: now,
    };
    const ledgerEntry: BuyerCreditLedgerEntry = {
      id: ledgerRef.id,
      buyerId: uid,
      type: input.type,
      creditAmount: input.creditAmount,
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note: input.note,
      metadata: stripUndefined(input.metadata ?? {}),
      createdAt: now,
    };

    if (!accountSnapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }
    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));
    return nextAccount;
  });
}

async function grantCampaignReward(
  uid: string,
  sellerId: string,
  campaignId: string,
  ledgerType: Extract<BuyerCreditLedgerType, 'review_reward' | 'fit_feedback_reward' | 'store_campaign_reward' | 'purchase_reward'>,
  claimKey: string,
  metadata: Record<string, unknown> = {},
): Promise<{ buyerCredits: BuyerCreditAccount; campaign: SellerRewardCampaign; ledgerEntry?: BuyerCreditLedgerEntry }> {
  const db = getDb();
  const campaignRef = db.collection('sellerRewardCampaigns').doc(sellerId).collection('items').doc(campaignId);
  const claimRef = campaignRef.collection('claims').doc(`${uid}-${claimKey}`);
  const accountRef = db.collection('buyerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc(`${ledgerType}-${sellerId}-${campaignId}-${claimKey}`);

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const [campaignSnapshot, claimSnapshot, accountSnapshot, ledgerSnapshot] = await Promise.all([
      transaction.get(campaignRef),
      transaction.get(claimRef),
      transaction.get(accountRef),
      transaction.get(ledgerRef),
    ]);

    if (!campaignSnapshot.exists) {
      throw new HttpError(404, 'campaign_not_found');
    }
    const campaign = normalizeCampaign(campaignSnapshot.data(), campaignSnapshot.id);
    if (!isCampaignActive(campaign)) {
      throw new HttpError(409, 'campaign_not_active');
    }
    if (!campaignMatchesLedgerType(campaign, ledgerType)) {
      throw new HttpError(409, 'campaign_type_mismatch');
    }
    if (claimSnapshot.exists || ledgerSnapshot.exists) {
      return {
        buyerCredits: accountSnapshot.exists ? normalizeAccount(accountSnapshot.data(), uid) : createWelcomeAccount(uid, now),
        campaign,
      };
    }
    if (campaign.spentCredits + campaign.rewardCredits > campaign.budgetCredits) {
      throw new HttpError(402, 'campaign_budget_exceeded');
    }

    const previousClaims = await transaction.get(campaignRef.collection('claims').where('buyerId', '==', uid));
    if (previousClaims.size >= campaign.perUserLimit) {
      throw new HttpError(409, 'campaign_user_limit_reached');
    }

    const account = accountSnapshot.exists
      ? normalizeAccount(accountSnapshot.data(), uid)
      : createWelcomeAccount(uid, now);
    const nextAccount: BuyerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits + campaign.rewardCredits),
      totalGrantedCredits: roundCredit(account.totalGrantedCredits + campaign.rewardCredits),
      updatedAt: now,
    };
    const nextCampaign: SellerRewardCampaign = {
      ...campaign,
      spentCredits: roundCredit(campaign.spentCredits + campaign.rewardCredits),
      updatedAt: now,
    };
    const ledgerEntry: BuyerCreditLedgerEntry = {
      id: ledgerRef.id,
      buyerId: uid,
      type: ledgerType,
      creditAmount: campaign.rewardCredits,
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note: campaign.title,
      metadata: stripUndefined({
        sellerId,
        campaignId,
        campaignType: campaign.type,
        ...metadata,
      }),
      createdAt: now,
    };

    if (!accountSnapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }
    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));
    transaction.set(claimRef, stripUndefined({
      id: claimRef.id,
      buyerId: uid,
      campaignId,
      sellerId,
      rewardCredits: campaign.rewardCredits,
      claimKey,
      createdAt: now,
    }));
    transaction.set(campaignRef, stripUndefined(nextCampaign), { merge: true });

    return { buyerCredits: nextAccount, campaign: nextCampaign, ledgerEntry };
  });
}

async function spendSponsoredTryOnCampaign(
  uid: string,
  sellerId: string,
  campaignId: string,
  claimKey: string,
  metadata: Record<string, unknown> = {},
): Promise<{ buyerCredits: BuyerCreditAccount; campaign: SellerRewardCampaign; ledgerEntry: BuyerCreditLedgerEntry }> {
  const db = getDb();
  const campaignRef = db.collection('sellerRewardCampaigns').doc(sellerId).collection('items').doc(campaignId);
  const claimRef = campaignRef.collection('claims').doc(`${uid}-${claimKey}`);
  const accountRef = db.collection('buyerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc(`sponsored-try-on-${sellerId}-${campaignId}-${claimKey}`);

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const [campaignSnapshot, claimSnapshot, accountSnapshot, ledgerSnapshot] = await Promise.all([
      transaction.get(campaignRef),
      transaction.get(claimRef),
      transaction.get(accountRef),
      transaction.get(ledgerRef),
    ]);

    if (!campaignSnapshot.exists) {
      throw new HttpError(404, 'campaign_not_found');
    }
    const campaign = normalizeCampaign(campaignSnapshot.data(), campaignSnapshot.id);
    if (!isCampaignActive(campaign)) {
      throw new HttpError(409, 'campaign_not_active');
    }
    if (campaign.type !== 'sponsored_try_on') {
      throw new HttpError(409, 'campaign_type_mismatch');
    }
    const cost = campaign.rewardCredits || getTryOnCreditCost();
    if (claimSnapshot.exists || ledgerSnapshot.exists) {
      return {
        buyerCredits: accountSnapshot.exists ? normalizeAccount(accountSnapshot.data(), uid) : createWelcomeAccount(uid, now),
        campaign,
        ledgerEntry: ledgerSnapshot.exists
          ? normalizeLedger(ledgerSnapshot.data(), uid)
          : createSponsoredTryOnLedger(ledgerRef.id, uid, campaign, sellerId, metadata, now, accountSnapshot.data()),
      };
    }
    if (campaign.spentCredits + cost > campaign.budgetCredits) {
      throw new HttpError(402, 'campaign_budget_exceeded');
    }

    const previousClaims = await transaction.get(campaignRef.collection('claims').where('buyerId', '==', uid));
    if (previousClaims.size >= campaign.perUserLimit) {
      throw new HttpError(409, 'campaign_user_limit_reached');
    }

    const account = accountSnapshot.exists
      ? normalizeAccount(accountSnapshot.data(), uid)
      : createWelcomeAccount(uid, now);
    const nextCampaign: SellerRewardCampaign = {
      ...campaign,
      spentCredits: roundCredit(campaign.spentCredits + cost),
      updatedAt: now,
    };
    const ledgerEntry = createSponsoredTryOnLedger(ledgerRef.id, uid, campaign, sellerId, metadata, now, account);

    if (!accountSnapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
      transaction.set(accountRef, stripUndefined(account), { merge: true });
    }
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));
    transaction.set(claimRef, stripUndefined({
      id: claimRef.id,
      buyerId: uid,
      campaignId,
      sellerId,
      rewardCredits: 0,
      sponsoredCredits: cost,
      claimKey,
      createdAt: now,
    }));
    transaction.set(campaignRef, stripUndefined(nextCampaign), { merge: true });

    return { buyerCredits: account, campaign: nextCampaign, ledgerEntry };
  });
}

async function buildBuyerCreditTasks(
  uid: string,
  orders: OrderRecord[],
  campaigns: SellerRewardCampaign[],
): Promise<BuyerCreditCenter['tasks']> {
  const db = getDb();
  const tasks: BuyerCreditCenter['tasks'] = [];
  const seenProducts = new Set<string>();
  const reviewCampaigns = campaigns.filter((campaign) => campaign.type === 'review_reward');
  const fitFeedbackCampaigns = campaigns.filter((campaign) => campaign.type === 'fit_feedback_reward');
  const sponsoredTryOnCampaigns = campaigns.filter((campaign) => campaign.type === 'sponsored_try_on');

  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (!item.productId || seenProducts.has(item.productId)) continue;
      seenProducts.add(item.productId);
      const productSnapshot = await db.collection('products').doc(item.productId).get();
      const product = productSnapshot.data() as ProductRecord | undefined;
      if (!product?.sellerId) continue;
      const hasReview = !(await db.collection('products').doc(item.productId).collection('reviews').where('userId', '==', uid).limit(1).get()).empty;
      if (hasReview) continue;
      const context = { productId: item.productId, category: product.category };
      const reviewCampaign = reviewCampaigns.find((candidate) =>
        candidate.sellerId === product.sellerId && campaignAppliesToContext(candidate, context),
      );
      if (reviewCampaign) {
        tasks.push({
          id: `review-${item.productId}`,
          type: 'review',
          title: `${item.title ?? product.title ?? 'Ürün'} için yorum yaz`,
          description: 'Satın aldığın ürünü değerlendir, mağazanın jeton ödülünü kazan.',
          rewardCredits: reviewCampaign.rewardCredits,
          actionLabel: 'Yorum yaz',
          productId: item.productId,
          productTitle: item.title ?? product.title,
          sellerId: product.sellerId,
          campaignId: reviewCampaign.id,
        });
      }

      const hasFitFeedback = !(await db.collection('products').doc(item.productId).collection('fitFeedback').where('userId', '==', uid).limit(1).get()).empty;
      const fitCampaign = hasFitFeedback
        ? undefined
        : fitFeedbackCampaigns.find((candidate) =>
          candidate.sellerId === product.sellerId && campaignAppliesToContext(candidate, context),
        );
      if (fitCampaign) {
        tasks.push({
          id: `fit-feedback-${item.productId}`,
          type: 'fit_feedback',
          title: `${item.title ?? product.title ?? 'Ürün'} için fit bilgisi paylaş`,
          description: 'Beden duruşunu paylaş, mağazanın fit feedback ödülünü kazan.',
          rewardCredits: fitCampaign.rewardCredits,
          actionLabel: 'Fit paylaş',
          productId: item.productId,
          productTitle: item.title ?? product.title,
          sellerId: product.sellerId,
          campaignId: fitCampaign.id,
        });
      }
    }
  }

  sponsoredTryOnCampaigns.slice(0, 6).forEach((campaign) => {
    tasks.push({
      id: `sponsored-try-on-${campaign.id}`,
      type: 'sponsored_try_on',
      title: campaign.title,
      description: campaign.description,
      rewardCredits: campaign.rewardCredits,
      actionLabel: 'Kabin’de dene',
      sellerId: campaign.sellerId,
      campaignId: campaign.id,
      productId: campaign.productIds?.[0],
    });
  });

  campaigns
    .filter((campaign) => campaign.type === 'store_promo')
    .slice(0, 6)
    .forEach((campaign) => {
      tasks.push({
        id: `campaign-${campaign.id}`,
        type: 'campaign',
        title: campaign.title,
        description: campaign.description,
        rewardCredits: campaign.rewardCredits,
        actionLabel: 'Jetonu al',
        sellerId: campaign.sellerId,
        campaignId: campaign.id,
      });
    });

  return tasks.slice(0, 12);
}

async function findPurchasedProduct(uid: string, productId: string) {
  const ordersSnapshot = await getDb().collection('orders').doc(uid).collection('items').limit(50).get();
  for (const orderDoc of ordersSnapshot.docs) {
    const order = orderDoc.data() as OrderRecord;
    const item = (order.items ?? []).find((entry) => entry.productId === productId);
    if (item) {
      return { orderId: order.id ?? orderDoc.id, item };
    }
  }
  return undefined;
}

async function findBestCampaign(
  sellerId: string,
  type: SellerRewardCampaignType,
  context: CampaignContext = {},
) {
  const snapshot = await getDb()
    .collection('sellerRewardCampaigns')
    .doc(sellerId)
    .collection('items')
    .where('type', '==', type)
    .where('status', '==', 'active')
    .limit(20)
    .get();
  const campaigns = snapshot.docs
    .map((item) => normalizeCampaign(item.data(), item.id))
    .filter((campaign) => isCampaignActive(campaign))
    .filter((campaign) => campaignAppliesToContext(campaign, context));
  return campaigns.sort((a, b) => b.rewardCredits - a.rewardCredits)[0];
}

async function enrichCampaignContext(context: CampaignContext): Promise<CampaignContext> {
  const categories = new Set((context.categories ?? []).filter(isNonEmptyStringValue));
  const productIds = context.productIds ?? (context.productId ? [context.productId] : []);
  const missingCategoryProductIds = productIds.filter(Boolean);

  if (missingCategoryProductIds.length > 0) {
    const docs = await Promise.all(missingCategoryProductIds.map((productId) => getDb().collection('products').doc(productId).get()));
    docs.forEach((snapshot) => {
      const product = snapshot.data() as ProductRecord | undefined;
      if (product?.category) categories.add(product.category);
    });
  }

  return {
    ...context,
    productIds,
    categories: Array.from(categories),
  };
}

function campaignAppliesToContext(campaign: SellerRewardCampaign, context: CampaignContext) {
  const productIds = new Set([
    ...(context.productIds ?? []),
    ...(context.productId ? [context.productId] : []),
  ].filter(isNonEmptyStringValue));
  const categories = new Set([
    ...(context.categories ?? []),
    ...(context.category ? [context.category] : []),
  ].filter(isNonEmptyStringValue));

  if (typeof campaign.minOrderAmount === 'number' && campaign.minOrderAmount > 0) {
    if (!Number.isFinite(context.orderTotal) || (context.orderTotal ?? 0) < campaign.minOrderAmount) {
      return false;
    }
  }
  if (campaign.productIds?.length) {
    if (productIds.size === 0) return false;
    if (!campaign.productIds.some((productId) => productIds.has(productId))) return false;
  }
  if (campaign.categoryFilter?.length) {
    if (categories.size === 0) return false;
    if (!campaign.categoryFilter.some((category) => categories.has(category))) return false;
  }
  return true;
}

async function ensureBuyerCreditAccount(uid: string): Promise<BuyerCreditAccount> {
  const db = getDb();
  const accountRef = db.collection('buyerCredits').doc(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    if (snapshot.exists) {
      return normalizeAccount(snapshot.data(), uid);
    }

    const now = new Date().toISOString();
    const account = createWelcomeAccount(uid, now);
    writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    transaction.set(accountRef, stripUndefined(account), { merge: true });

    logger.info('Granted welcome buyer AI credits.', {
      uid,
      credits: account.freeCredits,
    });

    return account;
  });
}

async function assertBuyerAccount(uid: string) {
  if (uid === 'demo-user') return;
  const userSnapshot = await getDb().collection('users').doc(uid).get();
  const user = userSnapshot.data() as UserRecord | undefined;
  if (user?.role !== 'buyer') {
    throw new HttpError(403, 'buyer_credit_requires_buyer');
  }
}

function createWelcomeAccount(uid: string, now: string): BuyerCreditAccount {
  const welcomeCredits = getBuyerWelcomeCreditAmount();
  return {
    buyerId: uid,
    freeCredits: welcomeCredits,
    paidCredits: 0,
    totalGrantedCredits: welcomeCredits,
    totalUsedCredits: 0,
    welcomeGrantApplied: true,
    createdAt: now,
    updatedAt: now,
  };
}

function writeWelcomeGrantLedger(
  transaction: FirebaseFirestore.Transaction,
  accountRef: FirebaseFirestore.DocumentReference,
  uid: string,
  now: string,
  account: BuyerCreditAccount,
) {
  const ledgerRef = accountRef.collection('ledger').doc();
  const entry: BuyerCreditLedgerEntry = {
    id: ledgerRef.id,
    buyerId: uid,
    type: 'welcome_grant',
    creditAmount: account.freeCredits,
    balanceAfter: {
      freeCredits: account.freeCredits,
      paidCredits: account.paidCredits,
    },
    note: 'Buyer welcome AI try-on credit grant',
    createdAt: now,
  };
  transaction.set(ledgerRef, stripUndefined(entry));
}

function createSponsoredTryOnLedger(
  id: string,
  uid: string,
  campaign: SellerRewardCampaign,
  sellerId: string,
  metadata: Record<string, unknown>,
  now: string,
  accountValue: FirebaseFirestore.DocumentData | BuyerCreditAccount | undefined,
): BuyerCreditLedgerEntry {
  const account = normalizeAccount(accountValue, uid);
  return {
    id,
    buyerId: uid,
    type: 'sponsored_try_on_used',
    creditAmount: 0,
    balanceAfter: {
      freeCredits: account.freeCredits,
      paidCredits: account.paidCredits,
    },
    note: 'Sponsorlu Kabin denemesi',
    metadata: stripUndefined({
      sellerId,
      campaignId: campaign.id,
      campaignType: campaign.type,
      sponsoredCredits: campaign.rewardCredits || getTryOnCreditCost(),
      ...metadata,
    }),
    createdAt: now,
  };
}

function normalizeAccount(value: FirebaseFirestore.DocumentData | undefined, uid: string): BuyerCreditAccount {
  const now = new Date().toISOString();
  return {
    buyerId: String(value?.buyerId || uid),
    freeCredits: normalizeNumber(value?.freeCredits),
    paidCredits: normalizeNumber(value?.paidCredits),
    totalGrantedCredits: normalizeNumber(value?.totalGrantedCredits),
    totalUsedCredits: normalizeNumber(value?.totalUsedCredits),
    welcomeGrantApplied: value?.welcomeGrantApplied !== false,
    createdAt: typeof value?.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : now,
  };
}

function normalizeLedger(value: FirebaseFirestore.DocumentData | undefined, uid: string): BuyerCreditLedgerEntry {
  const now = new Date().toISOString();
  return {
    id: String(value?.id || `ledger-${now}`),
    buyerId: String(value?.buyerId || uid),
    type: normalizeLedgerType(value?.type),
    creditAmount: normalizeNumber(value?.creditAmount),
    balanceAfter: {
      freeCredits: normalizeNumber(value?.balanceAfter?.freeCredits),
      paidCredits: normalizeNumber(value?.balanceAfter?.paidCredits),
    },
    note: String(value?.note || ''),
    metadata: isRecord(value?.metadata) ? value.metadata : undefined,
    createdAt: typeof value?.createdAt === 'string' ? value.createdAt : now,
  };
}

function normalizeCampaign(value: FirebaseFirestore.DocumentData | undefined, id: string): SellerRewardCampaign {
  const now = new Date().toISOString();
  const type = ['purchase_reward', 'review_reward', 'fit_feedback_reward', 'store_promo', 'sponsored_try_on'].includes(String(value?.type))
    ? String(value?.type) as SellerRewardCampaign['type']
    : 'store_promo';
  const rewardCredits = normalizeNumber(value?.rewardCredits, getDefaultCampaignReward(type));
  return {
    kind: 'seller_reward_campaign',
    id: String(value?.id || id),
    sellerId: String(value?.sellerId || ''),
    type,
    title: String(value?.title || 'Mağaza jeton kampanyası'),
    description: String(value?.description || 'Bu mağazadan sponsorlu jeton kazan.'),
    rewardCredits,
    budgetCredits: normalizeNumber(value?.budgetCredits, Math.max(rewardCredits, 50)),
    spentCredits: normalizeNumber(value?.spentCredits),
    status: ['active', 'paused', 'archived'].includes(String(value?.status))
      ? String(value?.status) as SellerRewardCampaign['status']
      : 'active',
    startsAt: typeof value?.startsAt === 'string' ? value.startsAt : undefined,
    endsAt: typeof value?.endsAt === 'string' ? value.endsAt : undefined,
    productIds: Array.isArray(value?.productIds) ? value.productIds.map(String) : undefined,
    categoryFilter: Array.isArray(value?.categoryFilter) ? value.categoryFilter.map(String) as SellerRewardCampaign['categoryFilter'] : undefined,
    minOrderAmount: Number.isFinite(Number(value?.minOrderAmount)) ? Math.max(0, Number(value?.minOrderAmount)) : undefined,
    perUserLimit: Math.max(1, Math.trunc(normalizeNumber(value?.perUserLimit, 1))),
    createdAt: typeof value?.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : now,
  };
}

function campaignMatchesLedgerType(
  campaign: SellerRewardCampaign,
  ledgerType: Extract<BuyerCreditLedgerType, 'review_reward' | 'fit_feedback_reward' | 'store_campaign_reward' | 'purchase_reward'>,
) {
  if (ledgerType === 'store_campaign_reward') return campaign.type === 'store_promo';
  return campaign.type === ledgerType;
}

function isReturnReversibleLedger(ledger: BuyerCreditLedgerEntry, request: RewardReversalReturnRequest) {
  if (ledger.creditAmount <= 0) return false;
  if (!['purchase_reward', 'review_reward', 'fit_feedback_reward'].includes(ledger.type)) return false;
  const metadata = isRecord(ledger.metadata) ? ledger.metadata : {};
  const sellerId = getOptionalString(metadata.sellerId);
  if (sellerId && sellerId !== request.sellerId) return false;
  if (ledger.type === 'purchase_reward') {
    return getOptionalString(metadata.sellerOrderId) === request.sellerOrderId;
  }
  if (ledger.type === 'review_reward' || ledger.type === 'fit_feedback_reward') {
    return getOptionalString(metadata.productId) === request.productId;
  }
  return false;
}

function getCampaignClaimIdForSource(
  buyerId: string,
  ledgerType: BuyerCreditLedgerType,
  request: RewardReversalReturnRequest,
) {
  if (ledgerType === 'purchase_reward') return `${buyerId}-purchase-${request.sellerOrderId}`;
  if (ledgerType === 'review_reward') return `${buyerId}-review-${request.productId}`;
  if (ledgerType === 'fit_feedback_reward') return `${buyerId}-fit-feedback-${request.productId}`;
  return undefined;
}

function isCampaignActive(campaign: SellerRewardCampaign) {
  const now = Date.now();
  const startsAt = campaign.startsAt ? Date.parse(campaign.startsAt) : undefined;
  const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : undefined;
  return campaign.status === 'active' &&
    campaign.spentCredits < campaign.budgetCredits &&
    (!Number.isFinite(startsAt) || (startsAt as number) <= now) &&
    (!Number.isFinite(endsAt) || (endsAt as number) >= now);
}

function getDefaultCampaignReward(type: SellerRewardCampaignType) {
  if (type === 'purchase_reward') return getPurchaseRewardCreditAmount();
  if (type === 'review_reward') return getReviewRewardCreditAmount();
  if (type === 'fit_feedback_reward') return getFitFeedbackRewardCreditAmount();
  if (type === 'sponsored_try_on') return getTryOnCreditCost();
  return getStorePromoRewardCreditAmount();
}

function getPurchaseRewardEligibleAmountTRY(metadata: Record<string, unknown>) {
  const subtotal = Number(metadata.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return subtotal;
  const total = Number(metadata.total ?? metadata.orderTotal);
  if (Number.isFinite(total) && total > 0) return total;
  return 0;
}

function validateProductReviewInput(value: unknown): ProductReviewInput {
  if (!isRecord(value)) throw new HttpError(400, 'Request body must be an object.');
  const productId = getNonEmptyString(value.productId, 'productId');
  const rating = Number(value.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'rating must be between 1 and 5.');
  }
  const text = getNonEmptyString(value.text, 'text').slice(0, 1000);
  const sizeBought = getNonEmptyString(value.sizeBought, 'sizeBought');
  const fitResult = String(value.fitResult || 'true');
  if (!['tight', 'true', 'loose'].includes(fitResult)) {
    throw new HttpError(400, 'fitResult is invalid.');
  }
  return {
    productId,
    rating,
    text,
    sizeBought,
    fitResult: fitResult as ProductReviewInput['fitResult'],
  };
}

function validateFitFeedbackInput(value: unknown): FitFeedbackInput {
  if (!isRecord(value)) throw new HttpError(400, 'Request body must be an object.');
  const productId = getNonEmptyString(value.productId, 'productId');
  const usualSize = getNonEmptyString(value.usualSize ?? value.boughtSize, 'usualSize');
  const boughtSize = getNonEmptyString(value.boughtSize ?? value.usualSize, 'boughtSize');
  const result = String(value.result || 'true');
  if (!['tight', 'true', 'loose'].includes(result)) {
    throw new HttpError(400, 'result is invalid.');
  }
  return {
    productId,
    usualSize,
    boughtSize,
    result: result as FitFeedbackInput['result'],
  };
}

function isNonEmptyStringValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value.trim();
}

function normalizeLedgerType(value: unknown): BuyerCreditLedgerType {
  const type = String(value);
  if (
    [
      'welcome_grant',
      'try_on_spent',
      'try_on_refund',
      'sponsored_try_on_used',
      'purchase_reward',
      'review_reward',
      'fit_feedback_reward',
      'store_campaign_reward',
      'reward_reversed',
      'manual_adjustment',
    ].includes(type)
  ) {
    return type as BuyerCreditLedgerType;
  }
  return 'manual_adjustment';
}

function getAvailableCredits(account: BuyerCreditAccount) {
  return roundCredit(account.freeCredits + account.paidCredits);
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCredit(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function getPositiveNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
