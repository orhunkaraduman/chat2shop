import {
  ProductImageEnhancementInput,
  ProductImageEnhancementResult,
} from '@/types';

import { InsufficientAICreditsError, isInsufficientAICreditsError } from './productIntelligence';

const endpoint = process.env.EXPO_PUBLIC_PRODUCT_IMAGE_ENHANCE_ENDPOINT;
const defaultTimeoutMs = Number(process.env.EXPO_PUBLIC_PRODUCT_IMAGE_ENHANCE_TIMEOUT_MS) || 120000;
const productImageEnhanceCost = Number(process.env.EXPO_PUBLIC_PRODUCT_IMAGE_ENHANCE_CREDIT_COST) || 5;

type ProductImageEnhancementRequestOptions = {
  authToken?: string;
  timeoutMs?: number;
};

export function getProductImageEnhanceCost() {
  return productImageEnhanceCost;
}

export function isProductImageEnhancementConfigured() {
  return Boolean(endpoint);
}

export async function enhanceProductImage(
  input: ProductImageEnhancementInput,
  options: ProductImageEnhancementRequestOptions = {},
): Promise<ProductImageEnhancementResult> {
  if (!endpoint) {
    return {
      enhancedImageUrl: input.imageUrl,
      source: 'mock',
      mode: input.mode,
      cost: productImageEnhanceCost,
      diagnostics: {
        fallbackReason: 'Product image enhancement endpoint is not configured.',
      },
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(options.authToken),
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status === 402 && body.includes('insufficient_ai_credits')) {
        throw new InsufficientAICreditsError('Görseli profesyonelleştirmek için yeterli jetonun yok.');
      }
      throw new Error(`Product image enhancement endpoint failed with ${response.status}: ${body}`);
    }

    const payload = await response.json();
    return {
      enhancedImageUrl: String(payload.enhancedImageUrl ?? ''),
      enhancedStoragePath: typeof payload.enhancedStoragePath === 'string' ? payload.enhancedStoragePath : undefined,
      sellerCredits: payload.sellerCredits,
      source: 'remote',
      mode: payload.mode ?? input.mode,
      cost: Number(payload.cost) || productImageEnhanceCost,
      diagnostics: {
        endpoint,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    if (isInsufficientAICreditsError(error)) {
      throw error;
    }
    throw new Error(getErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
}

function buildHeaders(authToken?: string) {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return 'Unable to read response body.';
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.name === 'AbortError'
      ? 'AI fotoğraf oluşturma beklenenden uzun sürdü. Görsel üretimi 1 dakikaya yaklaşabilir; lütfen tekrar dene.'
      : error.message;
  }
  return 'Görsel profesyonelleştirilemedi.';
}
