import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, ref, uploadString } from 'firebase/storage';

const projectId = 'chat2shop-rules-test';
const firestoreRules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');
const storageRules = readFileSync(resolve(__dirname, '../storage.rules'), 'utf8');

const now = new Date().toISOString();

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: firestoreRules, host: '127.0.0.1', port: 8080 },
    storage: { rules: storageRules, host: '127.0.0.1', port: 9199 },
  });

  try {
    await seedUsers(testEnv);
    await testFirestoreProductRules(testEnv);
    await testFirestoreCommerceRules(testEnv);
    await testFirestoreContentAnalyticsAndTryOnRules(testEnv);
    await testStorageRules(testEnv);
    console.log('Firebase rules tests passed.');
  } finally {
    await testEnv.cleanup();
  }
}

async function seedUsers(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/seller-1'), createUser('seller-1', 'seller'));
    await setDoc(doc(context.firestore(), 'users/seller-2'), createUser('seller-2', 'seller'));
    await setDoc(doc(context.firestore(), 'users/buyer-1'), createUser('buyer-1', 'buyer'));
    await setDoc(doc(context.firestore(), 'users/buyer-2'), createUser('buyer-2', 'buyer'));
  });
}

async function testFirestoreProductRules(testEnv: RulesTestEnvironment) {
  const sellerDb = testEnv.authenticatedContext('seller-1').firestore();
  const otherSellerDb = testEnv.authenticatedContext('seller-2').firestore();
  const buyerDb = testEnv.authenticatedContext('buyer-1').firestore();
  const guestDb = testEnv.unauthenticatedContext().firestore();

  const activeProductRef = doc(sellerDb, 'products/product-active');
  const archivedProductRef = doc(sellerDb, 'products/product-archived');

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products/product-active'), createProduct('product-active', 'seller-1', 'active'));
    await setDoc(doc(context.firestore(), 'products/product-archived'), createProduct('product-archived', 'seller-1', 'archived'));
  });

  await assertSucceeds(updateDoc(activeProductRef, { stock: 7, updatedAt: now }));
  await assertSucceeds(updateDoc(activeProductRef, { status: 'archived', updatedAt: now }));
  await assertSucceeds(updateDoc(activeProductRef, { status: 'active', updatedAt: now }));

  await assertFails(setDoc(doc(sellerDb, 'products/seller-client-product'), createProduct('seller-client-product', 'seller-1', 'active')));
  await assertFails(setDoc(doc(buyerDb, 'products/buyer-product'), createProduct('buyer-product', 'buyer-1', 'active')));
  await assertFails(updateDoc(doc(otherSellerDb, 'products/product-active'), { stock: 2, updatedAt: now }));
  await assertFails(updateDoc(activeProductRef, { sellerId: 'seller-2', updatedAt: now }));
  await assertFails(setDoc(doc(sellerDb, 'products/missing-image'), {
    ...createProduct('missing-image', 'seller-1', 'active'),
    imageUrl: '',
  }));
  await assertFails(deleteDoc(activeProductRef));

  await assertSucceeds(getDoc(doc(guestDb, 'products/product-active')));
  await assertFails(getDoc(doc(guestDb, 'products/product-archived')));

  const activeSnapshot = await getDoc(doc(sellerDb, 'products/product-active'));
  assert.equal(activeSnapshot.exists(), true);
}

async function testFirestoreCommerceRules(testEnv: RulesTestEnvironment) {
  const sellerDb = testEnv.authenticatedContext('seller-1').firestore();
  const otherSellerDb = testEnv.authenticatedContext('seller-2').firestore();
  const buyerDb = testEnv.authenticatedContext('buyer-1').firestore();
  const otherBuyerDb = testEnv.authenticatedContext('buyer-2').firestore();
  const guestDb = testEnv.unauthenticatedContext().firestore();

  const buyerOrderRef = doc(buyerDb, 'orders/buyer-1/items/order-1');
  const sellerOrderRef = doc(buyerDb, 'sellerOrders/seller-1/items/order-1-seller-1');
  const returnRequestRef = doc(buyerDb, 'returnRequests/buyer-1/items/return-1');

  await assertSucceeds(setDoc(buyerOrderRef, createBuyerOrder('order-1', 'buyer-1')));
  await assertFails(setDoc(doc(buyerDb, 'orders/buyer-2/items/order-bad'), createBuyerOrder('order-bad', 'buyer-1')));
  await assertFails(setDoc(doc(otherBuyerDb, 'orders/buyer-1/items/order-other'), createBuyerOrder('order-other', 'buyer-1')));

  await assertSucceeds(setDoc(sellerOrderRef, createSellerOrder('order-1-seller-1', 'seller-1', 'buyer-1', 'order-1')));
  await assertFails(setDoc(
    doc(otherBuyerDb, 'sellerOrders/seller-1/items/order-other-buyer'),
    createSellerOrder('order-other-buyer', 'seller-1', 'buyer-1', 'order-1'),
  ));
  await assertFails(updateDoc(doc(buyerDb, 'sellerOrders/seller-1/items/order-1-seller-1'), { status: 'shipped', updatedAt: now }));
  await assertFails(updateDoc(doc(otherSellerDb, 'sellerOrders/seller-1/items/order-1-seller-1'), { status: 'shipped', updatedAt: now }));
  await assertSucceeds(updateDoc(doc(sellerDb, 'sellerOrders/seller-1/items/order-1-seller-1'), {
    status: 'preparing',
    updatedAt: now,
    statusHistory: [
      { status: 'new', label: 'Yeni sipariş', description: 'Sipariş satıcıya iletildi.', createdAt: now },
      { status: 'preparing', label: 'Hazırlanıyor', description: 'Sipariş hazırlanıyor.', createdAt: now },
    ],
  }));
  await assertFails(updateDoc(doc(sellerDb, 'sellerOrders/seller-1/items/order-1-seller-1'), {
    total: 1,
    updatedAt: now,
  }));
  await assertSucceeds(getDoc(doc(buyerDb, 'sellerOrders/seller-1/items/order-1-seller-1')));
  await assertFails(getDoc(doc(guestDb, 'sellerOrders/seller-1/items/order-1-seller-1')));

  await assertSucceeds(setDoc(returnRequestRef, createReturnRequest('return-1', 'buyer-1', 'seller-1', 'order-1-seller-1')));
  await assertFails(setDoc(
    doc(otherBuyerDb, 'returnRequests/buyer-1/items/return-other'),
    createReturnRequest('return-other', 'buyer-1', 'seller-1', 'order-1-seller-1'),
  ));
  await assertFails(updateDoc(doc(buyerDb, 'returnRequests/buyer-1/items/return-1'), { status: 'approved', updatedAt: now }));
  await assertSucceeds(updateDoc(doc(sellerDb, 'returnRequests/buyer-1/items/return-1'), {
    status: 'approved',
    decisionNote: 'İade onaylandı.',
    updatedAt: now,
  }));

  const campaignRef = doc(sellerDb, 'sellerRewardCampaigns/seller-1/items/campaign-1');
  await assertSucceeds(setDoc(campaignRef, createSellerRewardCampaign('campaign-1', 'seller-1', 'store_promo')));
  await assertSucceeds(setDoc(
    doc(sellerDb, 'sellerRewardCampaigns/seller-1/items/campaign-fit'),
    createSellerRewardCampaign('campaign-fit', 'seller-1', 'fit_feedback_reward'),
  ));
  await assertSucceeds(setDoc(
    doc(sellerDb, 'sellerRewardCampaigns/seller-1/items/campaign-try-on'),
    {
      ...createSellerRewardCampaign('campaign-try-on', 'seller-1', 'sponsored_try_on'),
      categoryFilter: ['dress'],
      productIds: ['product-active'],
      minOrderAmount: 100,
    },
  ));
  await assertSucceeds(getDoc(doc(guestDb, 'sellerRewardCampaigns/seller-1/items/campaign-1')));
  await assertFails(setDoc(
    doc(buyerDb, 'sellerRewardCampaigns/buyer-1/items/campaign-bad'),
    createSellerRewardCampaign('campaign-bad', 'buyer-1', 'store_promo'),
  ));
  await assertFails(setDoc(
    doc(sellerDb, 'sellerRewardCampaigns/seller-1/items/campaign-invalid'),
    createSellerRewardCampaign('campaign-invalid', 'seller-1', 'photo_review_reward' as SellerRewardCampaignType),
  ));
  await assertFails(updateDoc(campaignRef, { spentCredits: 5, updatedAt: now }));
  await assertSucceeds(updateDoc(campaignRef, { status: 'paused', updatedAt: now }));
}

async function testStorageRules(testEnv: RulesTestEnvironment) {
  const sellerStorage = testEnv.authenticatedContext('seller-1').storage();
  const otherSellerStorage = testEnv.authenticatedContext('seller-2').storage();
  const guestStorage = testEnv.unauthenticatedContext().storage();

  const imageRef = ref(sellerStorage, 'sellerUploads/seller-1/test.png');
  await assertSucceeds(uploadString(imageRef, 'image-content', 'raw', { contentType: 'image/png' }));
  await assertSucceeds(deleteObject(imageRef));

  await assertFails(uploadString(ref(otherSellerStorage, 'sellerUploads/seller-1/other.png'), 'image-content', 'raw', {
    contentType: 'image/png',
  }));
  await assertFails(uploadString(ref(sellerStorage, 'sellerUploads/seller-1/file.txt'), 'text-content', 'raw', {
    contentType: 'text/plain',
  }));
  await assertFails(uploadString(ref(sellerStorage, 'sellerUploads/seller-1/large.png'), 'x'.repeat(8 * 1024 * 1024 + 1), 'raw', {
    contentType: 'image/png',
  }));
  await assertFails(uploadString(ref(guestStorage, 'sellerUploads/seller-1/guest.png'), 'image-content', 'raw', {
    contentType: 'image/png',
  }));

  const buyerStorage = testEnv.authenticatedContext('buyer-1').storage();
  const otherBuyerStorage = testEnv.authenticatedContext('buyer-2').storage();
  const tryOnInputRef = ref(buyerStorage, 'tryOnInputs/buyer-1/job-1/model.jpg');
  await assertSucceeds(uploadString(tryOnInputRef, 'image-content', 'raw', { contentType: 'image/jpeg' }));
  await assertFails(uploadString(ref(otherBuyerStorage, 'tryOnInputs/buyer-1/job-1/model.jpg'), 'image-content', 'raw', {
    contentType: 'image/jpeg',
  }));
  await assertFails(uploadString(ref(buyerStorage, 'tryOnPreviews/buyer-1/job-1/preview.png'), 'image-content', 'raw', {
    contentType: 'image/png',
  }));
}

async function testFirestoreContentAnalyticsAndTryOnRules(testEnv: RulesTestEnvironment) {
  const buyerDb = testEnv.authenticatedContext('buyer-1').firestore();
  const otherBuyerDb = testEnv.authenticatedContext('buyer-2').firestore();
  const guestDb = testEnv.unauthenticatedContext().firestore();

  await assertFails(setDoc(
    doc(buyerDb, 'products/product-active/reviews/review-1'),
    createReview('review-1', 'product-active', 'buyer-1'),
  ));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products/product-active/reviews/review-1'), createReview('review-1', 'product-active', 'buyer-1'));
  });
  await assertSucceeds(getDoc(doc(guestDb, 'products/product-active/reviews/review-1')));

  await assertFails(setDoc(
    doc(buyerDb, 'products/product-active/fitFeedback/fit-1'),
    createFitFeedback('fit-1', 'product-active', 'buyer-1'),
  ));
  await assertFails(setDoc(
    doc(otherBuyerDb, 'products/product-active/fitFeedback/fit-bad-owner'),
    createFitFeedback('fit-bad-owner', 'product-active', 'buyer-1'),
  ));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'buyerCredits/buyer-1'), {
      buyerId: 'buyer-1',
      freeCredits: 10,
      paidCredits: 0,
      totalGrantedCredits: 10,
      totalUsedCredits: 0,
      welcomeGrantApplied: true,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(context.firestore(), 'buyerCredits/buyer-1/ledger/ledger-1'), {
      id: 'ledger-1',
      buyerId: 'buyer-1',
      type: 'welcome_grant',
      creditAmount: 10,
      balanceAfter: { freeCredits: 10, paidCredits: 0 },
      note: 'Welcome grant',
      createdAt: now,
    });
  });
  await assertSucceeds(getDoc(doc(buyerDb, 'buyerCredits/buyer-1')));
  await assertSucceeds(getDoc(doc(buyerDb, 'buyerCredits/buyer-1/ledger/ledger-1')));
  await assertFails(getDoc(doc(otherBuyerDb, 'buyerCredits/buyer-1')));
  await assertFails(setDoc(doc(buyerDb, 'buyerCredits/buyer-1/ledger/client-entry'), {
    id: 'client-entry',
    buyerId: 'buyer-1',
    type: 'manual_adjustment',
    creditAmount: 10,
    balanceAfter: { freeCredits: 20, paidCredits: 0 },
    note: 'Client write',
    createdAt: now,
  }));

  await assertSucceeds(setDoc(doc(buyerDb, 'searchEvents/event-1'), createSearchEvent('event-1', 'buyer-1')));
  await assertFails(setDoc(doc(otherBuyerDb, 'searchEvents/event-bad-owner'), createSearchEvent('event-bad-owner', 'buyer-1')));
  await assertFails(getDoc(doc(buyerDb, 'searchEvents/event-1')));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'tryOnJobs/buyer-1/items/job-1'), {
      id: 'job-1',
      userId: 'buyer-1',
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });
  });
  await assertSucceeds(getDoc(doc(buyerDb, 'tryOnJobs/buyer-1/items/job-1')));
  await assertFails(getDoc(doc(otherBuyerDb, 'tryOnJobs/buyer-1/items/job-1')));
  await assertFails(setDoc(doc(buyerDb, 'tryOnJobs/buyer-1/items/job-client'), {
    id: 'job-client',
    userId: 'buyer-1',
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  }));
}

function createUser(uid: string, role: 'buyer' | 'seller') {
  return {
    id: uid,
    email: `${uid}@chat2shop.dev`,
    role,
    createdAt: now,
    updatedAt: now,
  };
}

function createProduct(id: string, sellerId: string, status: 'active' | 'archived' | 'draft') {
  return {
    id,
    title: 'Test Product',
    seller: 'Test Store',
    sellerId,
    price: 1200,
    color: 'Siyah',
    sizes: ['S', 'M'],
    stock: 10,
    status,
    source: 'firebase-seller',
    createdAt: now,
    updatedAt: now,
    visibilityScore: 88,
    imageUrl: 'https://example.com/product.jpg',
    category: 'dress',
    fit: 'regular',
    modesty: 'medium',
    season: ['spring'],
    styleTags: ['minimal'],
    vibeTags: ['clean'],
    occasionTags: ['daily'],
    aiSearchIntents: ['test product'],
    description: 'Rules test product.',
    sellerReliability: 90,
  };
}

function createBuyerOrder(id: string, buyerId: string) {
  return {
    id,
    buyerId,
    buyerEmail: `${buyerId}@chat2shop.dev`,
    items: [{ productId: 'product-active', size: 'M', quantity: 1 }],
    subtotal: 1200,
    shipping: 50,
    total: 1250,
    addressLabel: 'Ev · Kadıköy, İstanbul',
    paymentLabel: 'Visa •••• 4187',
    deliveryOptionId: 'standard',
    deliveryLabel: 'Standart teslimat',
    deliveryEta: '2-4 iş günü',
    sellerOrderIds: [`${id}-seller-1`],
    statusSummary: {
      status: 'new',
      label: 'Sipariş alındı',
      sellerOrderCount: 1,
      issueCount: 0,
      shippedCount: 0,
      completedCount: 0,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createSellerOrder(id: string, sellerId: string, buyerId: string, buyerOrderId: string) {
  return {
    id,
    sellerId,
    buyerId,
    buyerEmail: `${buyerId}@chat2shop.dev`,
    buyerOrderId,
    items: [{
      productId: 'product-active',
      title: 'Test Product',
      imageUrl: 'https://example.com/product.jpg',
      size: 'M',
      color: 'Siyah',
      quantity: 1,
      unitPrice: 1200,
      total: 1200,
    }],
    subtotal: 1200,
    shipping: 50,
    total: 1250,
    status: 'new',
    addressLabel: 'Ev · Kadıköy, İstanbul',
    paymentLabel: 'Visa •••• 4187',
    deliveryLabel: 'Standart teslimat',
    deliveryEta: '2-4 iş günü',
    statusHistory: [{ status: 'new', label: 'Yeni sipariş', description: 'Sipariş satıcıya iletildi.', createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

function createReturnRequest(id: string, buyerId: string, sellerId: string, sellerOrderId: string) {
  return {
    id,
    buyerId,
    buyerEmail: `${buyerId}@chat2shop.dev`,
    buyerOrderId: 'order-1',
    sellerId,
    sellerOrderId,
    productId: 'product-active',
    productTitle: 'Test Product',
    productImageUrl: 'https://example.com/product.jpg',
    size: 'M',
    quantity: 1,
    reason: 'Beden uymadı',
    status: 'requested',
    createdAt: now,
    updatedAt: now,
  };
}

function createSellerRewardCampaign(
  id: string,
  sellerId: string,
  type: SellerRewardCampaignType,
) {
  return {
    kind: 'seller_reward_campaign',
    id,
    sellerId,
    type,
    title: 'Sponsorlu jeton kampanyası',
    description: 'Mağaza sponsorlu jeton ödülü.',
    rewardCredits: 5,
    budgetCredits: 100,
    spentCredits: 0,
    status: 'active',
    perUserLimit: 1,
    createdAt: now,
    updatedAt: now,
  };
}

type SellerRewardCampaignType =
  | 'purchase_reward'
  | 'review_reward'
  | 'fit_feedback_reward'
  | 'store_promo'
  | 'sponsored_try_on';

function createReview(id: string, productId: string, userId: string) {
  return {
    id,
    productId,
    userId,
    rating: 5,
    text: 'Kaliteli ve bedeni doğru oldu.',
    sizeBought: 'M',
    fitResult: 'true',
    createdAt: now,
  };
}

function createFitFeedback(id: string, productId: string, userId: string) {
  return {
    id,
    productId,
    userId,
    usualSize: 'M',
    boughtSize: 'M',
    result: 'true',
    createdAt: now,
  };
}

function createSearchEvent(id: string, userId: string) {
  return {
    id,
    origin: 'client',
    userId,
    sessionId: 'session-1',
    source: 'catalog',
    eventType: 'catalog_search_submitted',
    query: 'siyah elbise',
    resultCount: 3,
    resultIds: ['product-active'],
    createdAt: now,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
