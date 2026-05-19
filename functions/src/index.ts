import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { Request, Response } from 'express';

import {
  buildDefaultSearchProfile,
  buildSearchIntentResult,
  generateMockChatRecommendations,
  generateMockSearchIntent,
  validateCatalogSearchInput,
  validateChatRecommendInput,
  validateSearchIntentInput,
} from './chatRecommend';
import { assertDailyChatAllowance } from './aiUsage';
import {
  claimBuyerCampaignReward as claimBuyerCampaignRewardTransaction,
  getBuyerCreditCenter,
  getBuyerCreditSummary,
  getBuyerWelcomeCreditAmount,
  getFitFeedbackRewardCreditAmount,
  getPurchaseRewardCreditAmount,
  getPurchaseRewardUnitTRY,
  getReviewRewardCreditAmount,
  getStorePromoRewardCreditAmount,
  getTryOnCreditCost,
  submitFitFeedbackWithReward as submitFitFeedbackWithRewardTransaction,
  submitProductReviewWithReward as submitProductReviewWithRewardTransaction,
} from './buyerCredits';
import { commitCheckout as commitCheckoutTransaction } from './checkout';
import {
  generateChatRecommendationsWithGemini,
  generateProductIntelligenceWithGemini,
  generateSearchIntentWithGemini,
  isGeminiEnabled,
} from './gemini';
import { generateMockProductIntelligence, validateProductIntelligenceInput } from './productIntelligence';
import {
  enhanceProductImage as enhanceProductImageTransaction,
  validateProductImageEnhancementInput,
} from './productImageEnhancement';
import { publishProduct as publishProductTransaction } from './productPublish';
import { mergeSearchFilters, recommendChatWithRetrieval, searchCatalogWithRetrieval } from './retrieval';
import { updateReturnRequestStatus as updateReturnRequestStatusTransaction } from './returns';
import { recordServerSearchEvent } from './searchAnalytics';
import { assertRateLimit, HttpError, isFirebaseAuthRequired, verifyAuthIfRequired, verifyRequiredAuth } from './security';
import { geminiSecrets } from './secrets';
import {
  assertProductAICreditAvailable,
  getProductAICreditCost,
  getProductImageEnhanceCreditCost,
  getSellerCreditLimitAmount,
  getSellerCreditPackages,
  getSellerCreditSummary,
  getWelcomeCreditAmount,
  purchaseSellerCreditPackage as purchaseSellerCreditPackageTransaction,
  spendProductAICredit,
} from './sellerCredits';
import {
  cleanupExpiredTryOnAssets,
  createTryOnJob as createTryOnJobRecord,
  getTryOnJob as getTryOnJobRecord,
  validateTryOnInput,
  validateTryOnJobLookup,
  processTryOnJob as processTryOnJobRecord,
} from './tryOn';

const httpsOptions = {
  region: process.env.FUNCTION_REGION ?? 'europe-west1',
  cors: true,
  maxInstances: 10,
};

const httpsOptionsWithGeminiSecret = {
  ...httpsOptions,
  secrets: geminiSecrets,
  timeoutSeconds: 120,
  memory: '512MiB' as const,
};

export const api = onRequest(httpsOptionsWithGeminiSecret, async (request, response) => {
  if (request.method === 'GET' && normalizePath(request.path) === '/health') {
    response.status(200).json({
      ok: true,
      service: 'chat2shop-functions',
      geminiEnabled: isGeminiEnabled(),
      authRequired: isFirebaseAuthRequired(),
      searchEngine: 'internal-search-v2',
      retrievalSource: 'firestore-metadata+ranking-signals',
      limits: {
        chatDailyFreeLimit: Number(process.env.CHAT_DAILY_FREE_LIMIT) || 250,
        sellerWelcomeAICredits: getWelcomeCreditAmount(),
        productAICreditCost: getProductAICreditCost(),
        productImageEnhanceCreditCost: getProductImageEnhanceCreditCost(),
        buyerWelcomeAICredits: getBuyerWelcomeCreditAmount(),
        tryOnCreditCost: getTryOnCreditCost(),
        buyerPurchaseRewardCreditsPerUnit: getPurchaseRewardCreditAmount(),
        buyerPurchaseRewardUnitTRY: getPurchaseRewardUnitTRY(),
        buyerReviewRewardCredits: getReviewRewardCreditAmount(),
        buyerFitFeedbackRewardCredits: getFitFeedbackRewardCreditAmount(),
        buyerStorePromoRewardCredits: getStorePromoRewardCreditAmount(),
        sellerCreditLimitAmount: getSellerCreditLimitAmount(),
        sellerCreditPackages: getSellerCreditPackages(),
      },
      endpoints: {
        productIntelligence: 'ready',
        enhanceProductImage: 'ready',
        buyerCreditCenter: 'ready',
        buyerCreditSummary: 'ready',
        claimBuyerCampaignReward: 'ready',
        submitProductReview: 'ready',
        submitFitFeedback: 'ready',
        updateReturnRequestStatus: 'ready',
        sellerCreditSummary: 'ready',
        sellerCreditPackages: 'ready',
        purchaseSellerCreditPackage: 'ready',
        chatRecommend: 'ready',
        searchIntent: 'ready',
        catalogSearch: 'ready',
        commitCheckout: 'ready',
        publishProduct: 'ready',
        createTryOnJob: 'ready',
        getTryOnJob: 'ready',
        tryOnPreview: 'legacy-job-wrapper',
      },
    });
    return;
  }

  const path = normalizePath(request.path);
  if (path === '/product-intelligence') {
    await handleProductIntelligence(request, response);
    return;
  }

  if (path === '/enhance-product-image') {
    await handleEnhanceProductImage(request, response);
    return;
  }

  if (path === '/seller-credit-summary') {
    await handleSellerCreditSummary(request, response);
    return;
  }

  if (path === '/buyer-credit-summary') {
    await handleBuyerCreditSummary(request, response);
    return;
  }

  if (path === '/buyer-credit-center') {
    await handleBuyerCreditCenter(request, response);
    return;
  }

  if (path === '/claim-buyer-campaign-reward') {
    await handleClaimBuyerCampaignReward(request, response);
    return;
  }

  if (path === '/submit-product-review') {
    await handleSubmitProductReview(request, response);
    return;
  }

  if (path === '/submit-fit-feedback') {
    await handleSubmitFitFeedback(request, response);
    return;
  }

  if (path === '/update-return-request-status') {
    await handleUpdateReturnRequestStatus(request, response);
    return;
  }

  if (path === '/seller-credit-packages') {
    await handleSellerCreditPackages(request, response);
    return;
  }

  if (path === '/purchase-seller-credit-package') {
    await handlePurchaseSellerCreditPackage(request, response);
    return;
  }

  if (path === '/chat-recommend') {
    await handleChatRecommend(request, response);
    return;
  }

  if (path === '/search-intent') {
    await handleSearchIntent(request, response);
    return;
  }

  if (path === '/catalog-search') {
    await handleCatalogSearch(request, response);
    return;
  }

  if (path === '/commit-checkout') {
    await handleCommitCheckout(request, response);
    return;
  }

  if (path === '/publish-product') {
    await handlePublishProduct(request, response);
    return;
  }

  if (path === '/try-on-preview') {
    await handleTryOnPreview(request, response);
    return;
  }

  if (path === '/create-try-on-job') {
    await handleCreateTryOnJob(request, response);
    return;
  }

  if (path === '/get-try-on-job') {
    await handleGetTryOnJob(request, response);
    return;
  }

  response.status(404).json({ error: 'Not found.' });
});

export const productIntelligence = onRequest(httpsOptionsWithGeminiSecret, handleProductIntelligence);
export const enhanceProductImage = onRequest(httpsOptionsWithGeminiSecret, handleEnhanceProductImage);
export const buyerCreditSummary = onRequest(httpsOptions, handleBuyerCreditSummary);
export const buyerCreditCenter = onRequest(httpsOptions, handleBuyerCreditCenter);
export const claimBuyerCampaignReward = onRequest(httpsOptions, handleClaimBuyerCampaignReward);
export const submitProductReview = onRequest(httpsOptions, handleSubmitProductReview);
export const submitFitFeedback = onRequest(httpsOptions, handleSubmitFitFeedback);
export const updateReturnRequestStatus = onRequest(httpsOptions, handleUpdateReturnRequestStatus);
export const sellerCreditSummary = onRequest(httpsOptions, handleSellerCreditSummary);
export const sellerCreditPackages = onRequest(httpsOptions, handleSellerCreditPackages);
export const purchaseSellerCreditPackage = onRequest(httpsOptions, handlePurchaseSellerCreditPackage);
export const chatRecommend = onRequest(httpsOptionsWithGeminiSecret, handleChatRecommend);
export const searchIntent = onRequest(httpsOptionsWithGeminiSecret, handleSearchIntent);
export const catalogSearch = onRequest(httpsOptionsWithGeminiSecret, handleCatalogSearch);
export const commitCheckout = onRequest(httpsOptions, handleCommitCheckout);
export const publishProduct = onRequest(httpsOptions, handlePublishProduct);
export const createTryOnJob = onRequest(httpsOptionsWithGeminiSecret, handleCreateTryOnJob);
export const getTryOnJob = onRequest(httpsOptionsWithGeminiSecret, handleGetTryOnJob);
export const tryOnPreview = onRequest(httpsOptionsWithGeminiSecret, handleTryOnPreview);
export const processTryOnJob = onDocumentCreated(
  {
    ...httpsOptionsWithGeminiSecret,
    document: 'tryOnJobs/{uid}/items/{jobId}',
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  async (event) => {
    const uid = event.params.uid;
    const jobId = event.params.jobId;
    await processTryOnJobRecord(uid, jobId);
  },
);
export const cleanupTryOnAssets = onSchedule(
  {
    region: process.env.FUNCTION_REGION ?? 'europe-west1',
    schedule: 'every 24 hours',
    timeoutSeconds: 300,
  },
  async () => {
    await cleanupExpiredTryOnAssets();
  },
);

async function handleCommitCheckout(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await commitCheckoutTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Checkout commit endpoint failed.', error);
    response.status(500).json({ error: 'Checkout commit failed.' });
  }
}

async function handlePublishProduct(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await publishProductTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Product publish endpoint failed.', error);
    response.status(500).json({ error: 'Product publish failed.' });
  }
}

async function handleSellerCreditSummary(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const sellerCredits = await getSellerCreditSummary(auth.uid);
    response.status(200).json({ sellerCredits });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Seller credit summary endpoint failed.', error);
    response.status(500).json({ error: 'Seller credit summary failed.' });
  }
}

async function handleBuyerCreditSummary(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const buyerCredits = await getBuyerCreditSummary(auth.uid);
    response.status(200).json({
      buyerCredits,
      cost: {
        tryOn: getTryOnCreditCost(),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Buyer credit summary endpoint failed.', error);
    response.status(500).json({ error: 'Buyer credit summary failed.' });
  }
}

async function handleBuyerCreditCenter(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const center = await getBuyerCreditCenter(auth.uid);
    response.status(200).json({ center });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Buyer credit center endpoint failed.', error);
    response.status(500).json({ error: 'Buyer credit center failed.' });
  }
}

async function handleClaimBuyerCampaignReward(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await claimBuyerCampaignRewardTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Claim buyer campaign reward endpoint failed.', error);
    response.status(500).json({ error: 'Campaign reward claim failed.' });
  }
}

async function handleSubmitProductReview(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await submitProductReviewWithRewardTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Submit product review endpoint failed.', error);
    response.status(500).json({ error: 'Product review submission failed.' });
  }
}

async function handleSubmitFitFeedback(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await submitFitFeedbackWithRewardTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Submit fit feedback endpoint failed.', error);
    response.status(500).json({ error: 'Fit feedback submission failed.' });
  }
}

async function handleUpdateReturnRequestStatus(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await updateReturnRequestStatusTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Return request status endpoint failed.', error);
    response.status(500).json({ error: 'Return request status update failed.' });
  }
}

async function handleSellerCreditPackages(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    assertRateLimit(request);
    response.status(200).json({
      packages: getSellerCreditPackages(),
      creditLimitAmount: getSellerCreditLimitAmount(),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Seller credit packages endpoint failed.', error);
    response.status(500).json({ error: 'Seller credit packages failed.' });
  }
}

async function handlePurchaseSellerCreditPackage(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const result = await purchaseSellerCreditPackageTransaction(auth.uid, request.body);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Seller credit package purchase endpoint failed.', error);
    response.status(500).json({ error: 'Seller credit package purchase failed.' });
  }
}

async function handleProductIntelligence(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const validation = validateProductIntelligenceInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid product intelligence input.', details: validation.errors });
      return;
    }

    const sellerCreditsBeforeGeneration = await assertProductAICreditAvailable(auth.uid);
    let aiMode: 'gemini' | 'mock-fallback' = 'mock-fallback';
    const geminiResult = await generateProductIntelligenceWithGemini(validation.value).catch((error) => {
      logger.warn('Gemini product intelligence failed. Falling back to deterministic provider.', {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    });
    if (geminiResult) {
      aiMode = 'gemini';
    }
    const sellerCredits = geminiResult
      ? await spendProductAICredit(auth.uid, {
          title: geminiResult.listing.title,
          variant: validation.value.variant ?? 0,
          aiSource: geminiResult.listing.aiSource,
        })
      : sellerCreditsBeforeGeneration;
    const result = {
      ...(geminiResult ?? generateMockProductIntelligence(validation.value, 'remote-fallback')),
      sellerCredits,
    };

    response.set('X-Chat2Shop-AI-Mode', aiMode);
    response.set('X-Chat2Shop-Product-AI-Credit-Cost', String(getProductAICreditCost()));
    response.set('X-Chat2Shop-Seller-AI-Credits-Remaining', String(sellerCredits.freeCredits + sellerCredits.paidCredits));
    logger.info('Generated product intelligence listing.', {
      uid: auth.uid,
      title: result.listing.title,
      source: result.listing.aiSource,
      confidence: result.listing.confidence,
      visibilityScore: result.listing.visibilityScore,
      aiMode,
      creditsRemaining: sellerCredits.freeCredits + sellerCredits.paidCredits,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Product intelligence endpoint failed.', error);
    response.status(500).json({ error: 'Product intelligence generation failed.' });
  }
}

async function handleEnhanceProductImage(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyRequiredAuth(request);
    const validation = validateProductImageEnhancementInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid product image enhancement input.', details: validation.errors });
      return;
    }

    const result = await enhanceProductImageTransaction(auth.uid, validation.value);
    response.set('X-Chat2Shop-Product-Image-Enhance-Credit-Cost', String(result.cost));
    response.set('X-Chat2Shop-Seller-AI-Credits-Remaining', String(result.sellerCredits.freeCredits + result.sellerCredits.paidCredits));
    logger.info('Enhanced product image.', {
      uid: auth.uid,
      enhancedStoragePath: result.enhancedStoragePath,
      cost: result.cost,
      creditsRemaining: result.sellerCredits.freeCredits + result.sellerCredits.paidCredits,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Product image enhancement endpoint failed.', error);
    response.status(500).json({ error: 'Product image enhancement failed.' });
  }
}

async function handleTryOnPreview(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateTryOnInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid try-on input.', details: validation.errors });
      return;
    }

    const result = await createTryOnJobRecord(auth.uid ?? 'demo-user', validation.value);
    logger.info('Created legacy try-on preview job.', {
      uid: auth.uid,
      jobId: result.job.id,
      productId: result.job.input.product.id,
      creditCost: result.job.creditCost,
    });
    if (result.buyerCredits) {
      response.set('X-Chat2Shop-Try-On-Credit-Cost', String(getTryOnCreditCost()));
      response.set('X-Chat2Shop-Buyer-AI-Credits-Remaining', String(result.buyerCredits.freeCredits + result.buyerCredits.paidCredits));
    }
    response.status(202).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Try-on preview endpoint failed.', error);
    response.status(500).json({ error: 'Try-on preview generation failed.' });
  }
}

async function handleCreateTryOnJob(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateTryOnInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid try-on input.', details: validation.errors });
      return;
    }

    const result = await createTryOnJobRecord(auth.uid ?? 'demo-user', validation.value);
    logger.info('Created try-on job.', {
      uid: auth.uid,
      jobId: result.job.id,
      productId: result.job.input.product.id,
      creditCost: result.job.creditCost,
    });
    if (result.buyerCredits) {
      response.set('X-Chat2Shop-Try-On-Credit-Cost', String(getTryOnCreditCost()));
      response.set('X-Chat2Shop-Buyer-AI-Credits-Remaining', String(result.buyerCredits.freeCredits + result.buyerCredits.paidCredits));
    }
    response.status(202).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Create try-on job endpoint failed.', error);
    response.status(500).json({ error: 'Try-on job creation failed.' });
  }
}

async function handleGetTryOnJob(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateTryOnJobLookup(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid try-on job lookup input.', details: validation.errors });
      return;
    }

    const job = await getTryOnJobRecord(auth.uid ?? 'demo-user', validation.value.jobId);
    if (!job) {
      response.status(404).json({ error: 'Try-on job not found.' });
      return;
    }

    response.status(200).json({ job });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Get try-on job endpoint failed.', error);
    response.status(500).json({ error: 'Try-on job lookup failed.' });
  }
}

async function handleChatRecommend(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateChatRecommendInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid chat recommendation input.', details: validation.errors });
      return;
    }

    const allowance = await assertDailyChatAllowance(auth.uid);
    if (allowance) {
      response.set('X-Chat2Shop-Chat-Limit', String(allowance.limit));
      response.set('X-Chat2Shop-Chat-Remaining', String(allowance.remaining));
      response.set('X-Chat2Shop-Chat-Date', allowance.dateKey);
    }

    const startedAt = Date.now();
    let aiMode: 'gemini' | 'mock-fallback' = 'mock-fallback';
    let fallbackReason: string | undefined;
    const geminiResult = await generateChatRecommendationsWithGemini(validation.value).catch((error) => {
      fallbackReason = error instanceof Error ? error.message : String(error);
      logger.warn('Gemini chat intent extraction failed. Falling back to deterministic provider.', {
        error: fallbackReason,
      });
      return undefined;
    });
    const intent = geminiResult?.intent ?? generateMockChatRecommendations(validation.value, 'remote').intent;
    if (geminiResult) {
      aiMode = 'gemini';
    }
    const result = validation.value.candidates && validation.value.candidates.length > 0
      ? (geminiResult ?? generateMockChatRecommendations(validation.value, 'remote'))
      : await recommendChatWithRetrieval({
          query: validation.value.prompt,
          profile: validation.value.profile,
          intent,
          filters: buildSearchIntentResult(validation.value.prompt, validation.value.profile, intent, 'remote').filters,
          mode: validation.value.mode,
          anchorProductId: validation.value.anchorProductId,
          limit: validation.value.limit,
        });

    response.set('X-Chat2Shop-AI-Mode', aiMode);
    await recordServerSearchEvent({
      userId: auth.uid,
      source: 'chat',
      eventType: result.recommendations.length > 0 ? 'server_chat_recommend_executed' : 'server_search_zero_results',
      query: validation.value.prompt,
      searchId: result.searchId,
      mode: validation.value.mode ?? 'default',
      anchorProductId: validation.value.anchorProductId,
      resultCount: result.recommendations.length,
      resultIds: result.recommendations.map((item) => item.productId),
      durationMs: Date.now() - startedAt,
      aiMode,
      fallbackReason,
    });
    if (fallbackReason) {
      await recordServerSearchEvent({
        userId: auth.uid,
        source: 'chat',
        eventType: 'server_search_fallback_used',
        query: validation.value.prompt,
        searchId: result.searchId,
        mode: validation.value.mode ?? 'default',
        anchorProductId: validation.value.anchorProductId,
        resultCount: result.recommendations.length,
        resultIds: result.recommendations.map((item) => item.productId),
        durationMs: Date.now() - startedAt,
        aiMode,
        fallbackReason,
      });
    }
    logger.info('Generated chat recommendations.', {
      uid: auth.uid,
      prompt: validation.value.prompt,
      candidateCount: validation.value.candidates?.length ?? 0,
      recommendationCount: result.recommendations.length,
      aiMode,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Chat recommendation endpoint failed.', error);
    response.status(500).json({ error: 'Chat recommendation failed.' });
  }
}

async function handleCatalogSearch(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateCatalogSearchInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid catalog search input.', details: validation.errors });
      return;
    }

    const startedAt = Date.now();
    const profile = buildDefaultSearchProfile(validation.value.profile);
    let aiMode: 'gemini' | 'mock-fallback' = 'mock-fallback';
    let fallbackReason: string | undefined;
    const geminiIntent = await generateSearchIntentWithGemini({
      query: validation.value.query,
      profile: validation.value.profile,
    }).catch((error) => {
      fallbackReason = error instanceof Error ? error.message : String(error);
      logger.warn('Gemini catalog search intent extraction failed. Falling back to deterministic provider.', {
        error: fallbackReason,
      });
      return undefined;
    });

    if (geminiIntent) {
      aiMode = 'gemini';
    }

    const intentResult = geminiIntent ?? generateMockSearchIntent(
      {
        query: validation.value.query,
        profile: validation.value.profile,
      },
      'remote',
    );

    const result = await searchCatalogWithRetrieval({
      query: validation.value.query,
      profile,
      intent: intentResult.intent,
      filters: mergeSearchFilters(intentResult.filters, validation.value.filters),
      sort: validation.value.sort,
      page: validation.value.page,
      pageSize: validation.value.pageSize,
      anchorProductId: validation.value.anchorProductId,
      mode: validation.value.mode,
    });

    const appliedFilters = mergeSearchFilters(intentResult.filters, validation.value.filters);
    response.set('X-Chat2Shop-AI-Mode', aiMode);
    await recordServerSearchEvent({
      userId: auth.uid,
      source: 'catalog',
      eventType: result.resultCount > 0 ? 'server_catalog_search_executed' : 'server_search_zero_results',
      query: validation.value.query,
      searchId: result.searchId,
      mode: validation.value.mode ?? 'default',
      anchorProductId: validation.value.anchorProductId,
      resultCount: result.resultCount,
      resultIds: result.resultIds,
      filters: toAnalyticsFilters(appliedFilters, validation.value.sort),
      durationMs: Date.now() - startedAt,
      aiMode,
      fallbackReason,
    });
    if (fallbackReason) {
      await recordServerSearchEvent({
        userId: auth.uid,
        source: 'catalog',
        eventType: 'server_search_fallback_used',
        query: validation.value.query,
        searchId: result.searchId,
        mode: validation.value.mode ?? 'default',
        anchorProductId: validation.value.anchorProductId,
        resultCount: result.resultCount,
        resultIds: result.resultIds,
        filters: toAnalyticsFilters(appliedFilters, validation.value.sort),
        durationMs: Date.now() - startedAt,
        aiMode,
        fallbackReason,
      });
    }
    logger.info('Generated catalog search results.', {
      uid: auth.uid,
      query: validation.value.query,
      resultCount: result.resultCount,
      source: result.source,
      aiMode,
    });
    response.status(200).json({
      ...result,
      intent: intentResult.intent,
      appliedFilters,
      results: result.recommendations,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Catalog search endpoint failed.', error);
    response.status(500).json({ error: 'Catalog search failed.' });
  }
}

async function handleSearchIntent(
  request: Request,
  response: Response,
) {
  response.set('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    assertRateLimit(request);
    const auth = await verifyAuthIfRequired(request);
    const validation = validateSearchIntentInput(request.body);

    if (!validation.ok) {
      response.status(400).json({ error: 'Invalid search intent input.', details: validation.errors });
      return;
    }

    let aiMode: 'gemini' | 'mock-fallback' = 'mock-fallback';
    const geminiResult = await generateSearchIntentWithGemini(validation.value).catch((error) => {
      logger.warn('Gemini search intent extraction failed. Falling back to deterministic provider.', {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    });
    if (geminiResult) {
      aiMode = 'gemini';
    }
    const result = geminiResult ?? generateMockSearchIntent(validation.value, 'remote');

    response.set('X-Chat2Shop-AI-Mode', aiMode);
    logger.info('Generated search intent.', {
      uid: auth.uid,
      query: validation.value.query,
      category: result.filters.category,
      color: result.filters.color,
      aiMode,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('Search intent endpoint failed.', error);
    response.status(500).json({ error: 'Search intent generation failed.' });
  }
}

function normalizePath(path: string) {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function toAnalyticsFilters(
  filters: ReturnType<typeof mergeSearchFilters>,
  sort: string | undefined,
): Record<string, string | number | boolean> {
  return {
    category: filters.category ?? 'all',
    color: filters.color ?? 'all',
    size: filters.size ?? 'all',
    occasion: filters.occasion ?? 'all',
    styles: filters.styles.join(',') || 'all',
    budgetMax: filters.budgetMax ?? 0,
    sort: sort ?? 'ai',
  };
}
