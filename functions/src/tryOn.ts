import { logger } from 'firebase-functions';

import { getBucket, getDb } from './admin';
import {
  getTryOnCreditCost,
  refundSponsoredTryOnCampaign,
  refundTryOnCredit,
  spendTryOnCredit,
  sponsorTryOnIfAvailable,
} from './buyerCredits';
import { generateTryOnImageWithGemini, GeminiInlineImage } from './gemini';
import {
  AISource,
  Category,
  CreateTryOnJobResult,
  TryOnFrameMode,
  TryOnInput,
  TryOnJob,
  TryOnPreview,
  TryOnResult,
} from './types';

type ValidationResult =
  | { ok: true; value: TryOnInput }
  | { ok: false; errors: string[] };

type TryOnJobValidationResult =
  | { ok: true; value: { jobId: string } }
  | { ok: false; errors: string[] };

const categories: Category[] = ['dress', 'shirt', 'pants', 'jacket', 'shoes', 'bag', 'accessory'];
const modes: TryOnInput['mode'][] = ['avatar', 'photo', 'product'];
const environments: NonNullable<TryOnInput['environment']>[] = ['outdoor', 'home', 'party', 'office', 'holiday'];
const frameModes: TryOnFrameMode[] = ['full_body', 'upper_body', 'lower_body', 'accessory_focus'];
const maxImageBytes = 8 * 1024 * 1024;

export function validateTryOnInput(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  if (!isRecord(value.product)) {
    return { ok: false, errors: ['product is required.'] };
  }

  const product = value.product;
  const mode = getString(value.mode) as TryOnInput['mode'];
  const category = getString(product.category) as Category;
  const environment = getString(value.environment) as NonNullable<TryOnInput['environment']>;
  const frameMode = getString(value.frameMode) as TryOnFrameMode;
  const normalizedCategory = categories.includes(category) ? category : 'dress';
  const normalizedProductTitle = getString(product.title);

  const normalized: TryOnInput = {
    product: {
      id: getString(product.id),
      title: normalizedProductTitle,
      imageUrl: getString(product.imageUrl),
      color: getString(product.color),
      category: normalizedCategory,
      fit: getString(product.fit) || 'regular',
    },
    mode: modes.includes(mode) ? mode : 'avatar',
    modelImageUri: getString(value.modelImageUri),
    modelImageStoragePath: normalizeStoragePath(value.modelImageStoragePath),
    selectedSize: getString(value.selectedSize),
    selectedColor: getString(value.selectedColor),
    environment: environments.includes(environment) ? environment : 'outdoor',
    frameMode: frameModes.includes(frameMode)
      ? frameMode
      : getTryOnFrameMode({ category: normalizedCategory, title: normalizedProductTitle }),
    outfitProductIds: Array.isArray(value.outfitProductIds)
      ? value.outfitProductIds.filter((id): id is string => typeof id === 'string')
      : [],
  };

  if (!normalized.product.id) errors.push('product.id is required.');
  if (!normalized.product.title) errors.push('product.title is required.');
  if (!normalized.product.imageUrl) errors.push('product.imageUrl is required.');
  if (!normalized.modelImageUri && !normalized.modelImageStoragePath) errors.push('modelImageUri is required.');
  if (!normalized.selectedSize) errors.push('selectedSize is required.');
  if (!normalized.selectedColor) errors.push('selectedColor is required.');
  if (normalized.mode === 'photo' && normalized.modelImageUri.startsWith('file:')) {
    errors.push('Local file modelImageUri cannot be used by the try-on backend. Upload the image first.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: normalized };
}

export function validateTryOnJobLookup(value: unknown): TryOnJobValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const jobId = getString(value.jobId);
  if (!jobId) {
    return { ok: false, errors: ['jobId is required.'] };
  }

  return { ok: true, value: { jobId } };
}

export async function createTryOnJob(uid: string, input: TryOnInput): Promise<CreateTryOnJobResult> {
  if (!uid) {
    throw new Error('Try-on job requires an authenticated user.');
  }

  const now = new Date().toISOString();
  const jobRef = getTryOnJobCollection(uid).doc();
  const creditCost = getTryOnCreditCost();
  const sponsor = await sponsorTryOnIfAvailable(uid, input.product.id, jobRef.id, {
    productTitle: input.product.title,
    environment: input.environment,
  });
  let buyerCredits = sponsor.buyerCredits;
  if (!sponsor.sponsored) {
    buyerCredits = await spendTryOnCredit(uid, {
      jobId: jobRef.id,
      productId: input.product.id,
      productTitle: input.product.title,
      environment: input.environment,
    });
  }
  const job: TryOnJob = {
    id: jobRef.id,
    userId: uid,
    status: 'queued',
    input,
    provider: 'gemini',
    creditCost,
    chargedCredits: !sponsor.sponsored,
    sponsoredCredits: sponsor.sponsored ? creditCost : undefined,
    sponsoredBySellerId: sponsor.campaign?.sellerId,
    sponsorCampaignId: sponsor.campaign?.id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await jobRef.set(stripUndefined({
      ...job,
      recordType: 'tryOnJob',
    }));
  } catch (error) {
    if (!sponsor.sponsored) {
      buyerCredits = await refundTryOnCredit(uid, {
        jobId: jobRef.id,
        productId: input.product.id,
        reason: 'job_create_failed',
      });
    } else {
      await refundSponsoredTryOnCampaign(uid, {
        jobId: jobRef.id,
        sellerId: sponsor.campaign?.sellerId,
        campaignId: sponsor.campaign?.id,
        reason: 'job_create_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }

  return { job, buyerCredits };
}

export async function getTryOnJob(uid: string, jobId: string): Promise<TryOnJob | undefined> {
  const snapshot = await getTryOnJobCollection(uid).doc(jobId).get();
  if (!snapshot.exists) return undefined;
  return snapshot.data() as TryOnJob;
}

export async function processTryOnJob(uid: string, jobId: string) {
  const jobRef = getTryOnJobCollection(uid).doc(jobId);
  const snapshot = await jobRef.get();
  if (!snapshot.exists) return;

  const job = snapshot.data() as TryOnJob;
  if (job.status !== 'queued') return;

  const now = new Date().toISOString();
  await jobRef.update({ status: 'processing', updatedAt: now });

  try {
    const preview = await generateGeminiTryOnPreview(job.input, uid, jobId);
    const completedAt = new Date().toISOString();
    await jobRef.update({
      status: 'completed',
      preview,
      completedAt,
      expiresAt: preview.expiresAt,
      updatedAt: completedAt,
    });
    logger.info('Try-on job completed.', {
      uid,
      jobId,
      productId: preview.productId,
      provider: preview.provider,
      source: preview.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedAt = new Date().toISOString();
    const failedPatch: Partial<TryOnJob> = {
      status: 'failed',
      error: message,
      updatedAt: failedAt,
    };
    if (job.chargedCredits && !job.refundedCredits) {
      try {
        await refundTryOnCredit(uid, {
          jobId,
          productId: job.input.product.id,
          reason: 'provider_failed',
          error: message,
        });
        failedPatch.refundedCredits = true;
      } catch (refundError) {
        logger.warn('Try-on credit refund failed.', {
          uid,
          jobId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        });
      }
    } else if (job.sponsoredCredits && job.sponsoredBySellerId && job.sponsorCampaignId && !job.refundedCredits) {
      try {
        await refundSponsoredTryOnCampaign(uid, {
          jobId,
          sellerId: job.sponsoredBySellerId,
          campaignId: job.sponsorCampaignId,
          reason: 'provider_failed',
          error: message,
        });
        failedPatch.refundedCredits = true;
      } catch (refundError) {
        logger.warn('Sponsored try-on campaign refund failed.', {
          uid,
          jobId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        });
      }
    }
    await jobRef.update(failedPatch);
    logger.warn('Try-on job failed.', { uid, jobId, error: message });
  }
}

export async function cleanupExpiredTryOnAssets() {
  const cutoff = Date.now() - getAssetRetentionHours() * 60 * 60 * 1000;
  const bucket = getBucket();
  const prefixes = ['tryOnInputs/', 'tryOnPreviews/'];
  let deleted = 0;

  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      const createdAt = Date.parse(String(file.metadata.timeCreated ?? ''));
      if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;
      await file.delete({ ignoreNotFound: true });
      deleted += 1;
    }
  }

  logger.info('Cleaned up expired try-on assets.', { deleted });
}

export function generateMockTryOnPreview(input: TryOnInput, source: AISource = 'remote'): TryOnResult {
  return {
    preview: createTryOnPreview(input, source),
  };
}

export function createTryOnPreview(
  input: TryOnInput,
  source: AISource = 'remote',
  overrides: Partial<TryOnPreview> = {},
): TryOnPreview {
  const previewImageUri = input.mode === 'product' ? input.product.imageUrl : input.modelImageUri;

  return {
    id: `tryon-${input.product.id}-${input.selectedSize}-${input.selectedColor}-${Date.now()}`,
    productId: input.product.id,
    productTitle: input.product.title,
    productImageUri: input.product.imageUrl,
    modelImageUri: input.modelImageUri,
    previewImageUri,
    mode: input.mode,
    selectedSize: input.selectedSize,
    selectedColor: input.selectedColor,
    environment: input.environment,
    frameMode: input.frameMode,
    source,
    provider: source === 'mock' ? 'mock' : 'gemini',
    confidence: input.mode === 'photo' ? 'medium' : 'high',
    fitNote: buildFitNote(input),
    overlayLabel: `${input.selectedColor} / ${input.selectedSize} preview`,
    disclaimer:
      'Bu görsel AI tarafından oluşturulmuş stil önizlemesidir. Gerçek ürün duruşu bedene, kumaşa ve ışığa göre değişebilir.',
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

async function generateGeminiTryOnPreview(input: TryOnInput, uid: string, jobId: string): Promise<TryOnPreview> {
  const [modelImage, productImage] = await Promise.all([
    loadTryOnImage(input.modelImageStoragePath, input.modelImageUri),
    loadTryOnImage(undefined, input.product.imageUrl),
  ]);
  const generated = await generateTryOnImageWithGemini({
    tryOnInput: input,
    modelImage,
    productImage,
  });

  if (!generated) {
    throw new Error('Gemini try-on image provider is not configured.');
  }

  const previewStoragePath = `tryOnPreviews/${uid}/${jobId}/preview.${getImageExtension(generated.mimeType)}`;
  const expiresAt = new Date(Date.now() + getAssetRetentionHours() * 60 * 60 * 1000).toISOString();
  const buffer = Buffer.from(generated.data, 'base64');
  const file = getBucket().file(previewStoragePath);
  await file.save(buffer, {
    contentType: generated.mimeType,
    resumable: false,
    metadata: {
      metadata: {
        ownerId: uid,
        jobId,
        source: 'try-on-preview',
      },
    },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
  });

  return createTryOnPreview(input, 'remote', {
    id: jobId,
    jobId,
    provider: 'gemini',
    previewImageUri: signedUrl,
    previewStoragePath,
    expiresAt,
    confidence: input.mode === 'photo' ? 'high' : 'medium',
  });
}

async function loadTryOnImage(storagePath: string | undefined, uri: string): Promise<GeminiInlineImage> {
  if (storagePath) {
    assertSafeTryOnStoragePath(storagePath);
    const file = getBucket().file(storagePath);
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error('Try-on input file must be an image.');
    }
    const size = Number(metadata.size ?? 0);
    if (size > maxImageBytes) {
      throw new Error('Try-on input image exceeds 8MB.');
    }
    const [buffer] = await file.download();
    return {
      mimeType: contentType,
      data: buffer.toString('base64'),
    };
  }

  if (!uri || uri.startsWith('file:')) {
    throw new Error('Try-on image must be a remote URL or Storage path.');
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Try-on image download failed with ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error('Try-on image URL must return an image.');
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxImageBytes) {
    throw new Error('Try-on image exceeds 8MB.');
  }

  return {
    mimeType: contentType.split(';')[0],
    data: Buffer.from(arrayBuffer).toString('base64'),
  };
}

function getTryOnJobCollection(uid: string) {
  return getDb().collection('tryOnJobs').doc(uid).collection('items');
}

function assertSafeTryOnStoragePath(path: string) {
  if (!path.startsWith('tryOnInputs/') && !path.startsWith('tryOnPreviews/')) {
    throw new Error('Unsupported try-on Storage path.');
  }
  if (path.includes('..')) {
    throw new Error('Invalid try-on Storage path.');
  }
}

function normalizeStoragePath(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildFitNote(input: TryOnInput) {
  const environment = getEnvironmentLabel(input.environment);
  if (input.product.fit === 'oversize') {
    return `${input.selectedSize} beden oversize duruşu koruyacak şekilde ${environment} ortamında önizlendi.`;
  }
  if (input.product.fit === 'slim') {
    return `${input.selectedSize} beden ${environment} ortamında daha vücuda yakın bir duruş verebilir.`;
  }
  return `${input.selectedSize} beden ${input.product.fit} fit için ${environment} ortamında dengeli bir önizleme olarak üretildi.`;
}

function getTryOnFrameMode(product: Pick<TryOnInput['product'], 'category' | 'title'>): TryOnFrameMode {
  const title = product.title.toLocaleLowerCase('tr-TR');

  if (
    product.category === 'shoes' ||
    /\b(ayakkabı|sneaker|bot|çizme|loafer|topuklu|sandalet)\b/u.test(title)
  ) {
    return 'lower_body';
  }

  if (
    product.category === 'bag' ||
    product.category === 'accessory' ||
    /\b(çanta|bag|aksesuar|fular|şal|kemer|takı|kolye|küpe)\b/u.test(title)
  ) {
    return 'accessory_focus';
  }

  if (
    product.category === 'dress' ||
    product.category === 'pants' ||
    /\b(elbise|abiye|tulum|pantolon|jean|etek|kaban|trenç|trench|pardösü|maxi|midi|gown)\b/u.test(title)
  ) {
    return 'full_body';
  }

  return 'upper_body';
}

function getEnvironmentLabel(environment: TryOnInput['environment']) {
  if (environment === 'home') return 'ev';
  if (environment === 'party') return 'parti';
  if (environment === 'office') return 'ofis';
  if (environment === 'holiday') return 'tatil';
  return 'dış mekan';
}

function getImageExtension(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function getAssetRetentionHours() {
  const value = Number(process.env.TRY_ON_ASSET_RETENTION_HOURS);
  return Number.isFinite(value) && value > 0 ? value : 24;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (!isRecord(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    result[key] = stripUndefined(item);
  }
  return result as T;
}
