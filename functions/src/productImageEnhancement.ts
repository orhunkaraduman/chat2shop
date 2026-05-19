import { randomUUID } from 'crypto';

import { getBucket } from './admin';
import { generateProductImageEnhancementWithGemini, type GeminiInlineImage } from './gemini';
import {
  assertProductImageEnhanceCreditAvailable,
  getProductImageEnhanceCreditCost,
  spendProductImageEnhanceCredit,
} from './sellerCredits';
import {
  PRODUCT_IMAGE_ENHANCEMENT_MODES,
  type ProductImageEnhancementInput,
  type ProductImageEnhancementMode,
  type ProductImageEnhancementResult,
  type SellerDraft,
} from './types';

const maxImageBytes = 8 * 1024 * 1024;

type ValidationResult =
  | { ok: true; value: ProductImageEnhancementInput }
  | { ok: false; errors: string[] };

export function validateProductImageEnhancementInput(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const imageUrl = getString(value.imageUrl).trim();
  if (!imageUrl) errors.push('imageUrl is required.');
  if (imageUrl.startsWith('file:')) errors.push('imageUrl must be a remote URL or Storage path.');

  const rawMode = getString(value.mode).trim();
  const mode = rawMode || 'catalog_white';
  if (!isProductImageEnhancementMode(mode)) {
    errors.push(`mode must be one of: ${PRODUCT_IMAGE_ENHANCEMENT_MODES.join(', ')}.`);
  }
  const enhancementMode: ProductImageEnhancementMode = isProductImageEnhancementMode(mode) ? mode : 'catalog_white';

  const draftContext = isRecord(value.draftContext)
    ? {
        imageUrl,
        price: getString(value.draftContext.price),
        stock: getString(value.draftContext.stock),
        sizes: getString(value.draftContext.sizes),
        optionalName: getString(value.draftContext.optionalName),
        optionalCategory: getString(value.draftContext.optionalCategory),
      }
    : undefined;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      imageUrl,
      mode: enhancementMode,
      draftContext,
    },
  };
}

export async function enhanceProductImage(
  uid: string,
  input: ProductImageEnhancementInput,
): Promise<ProductImageEnhancementResult> {
  if (!uid) {
    throw new Error('Product image enhancement requires an authenticated seller.');
  }

  await assertProductImageEnhanceCreditAvailable(uid);

  const productImage = await loadProductImage(input.imageUrl);
  const generated = await generateProductImageEnhancementWithGemini({
    enhancementInput: input,
    productImage,
  });

  if (!generated) {
    throw new Error('Gemini product image enhancement provider is not configured.');
  }

  const storagePath = `sellerUploads/${uid}/enhanced/product-${Date.now()}.${getImageExtension(generated.mimeType)}`;
  const enhancedImageUrl = await saveEnhancedImage(uid, storagePath, generated);
  const sellerCredits = await spendProductImageEnhanceCredit(uid, {
    originalImageUrl: input.imageUrl,
    enhancedStoragePath: storagePath,
    mode: input.mode,
    cost: getProductImageEnhanceCreditCost(),
  });

  return {
    enhancedImageUrl,
    enhancedStoragePath: storagePath,
    sellerCredits,
    source: 'remote',
    mode: input.mode,
    cost: getProductImageEnhanceCreditCost(),
  };
}

function isProductImageEnhancementMode(value: string): value is ProductImageEnhancementMode {
  return PRODUCT_IMAGE_ENHANCEMENT_MODES.includes(value as ProductImageEnhancementMode);
}

async function saveEnhancedImage(uid: string, storagePath: string, image: GeminiInlineImage) {
  const bucket = getBucket();
  const file = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await file.save(Buffer.from(image.data, 'base64'), {
    contentType: image.mimeType,
    resumable: false,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        ownerId: uid,
        source: 'product-image-enhancement',
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

async function loadProductImage(uri: string): Promise<GeminiInlineImage> {
  if (uri.startsWith('sellerUploads/')) {
    assertSafeSellerStoragePath(uri);
    const file = getBucket().file(uri);
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error('Product image file must be an image.');
    }
    const size = Number(metadata.size ?? 0);
    if (size > maxImageBytes) {
      throw new Error('Product image exceeds 8MB.');
    }
    const [buffer] = await file.download();
    return {
      mimeType: contentType,
      data: buffer.toString('base64'),
    };
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Product image download failed with ${response.status}.`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error('Product image URL must return an image.');
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxImageBytes) {
    throw new Error('Product image exceeds 8MB.');
  }

  return {
    mimeType: contentType,
    data: Buffer.from(arrayBuffer).toString('base64'),
  };
}

function assertSafeSellerStoragePath(path: string) {
  if (!path.startsWith('sellerUploads/') || path.includes('..')) {
    throw new Error('Unsupported product image Storage path.');
  }
}

function getImageExtension(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}
