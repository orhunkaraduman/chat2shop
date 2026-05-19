import {
  BuyerCreditAccount,
  CreateTryOnJobResult,
  Product,
  TryOnFrameMode,
  TryOnInput,
  TryOnJob,
  TryOnPreview,
  TryOnProvider,
  TryOnResult,
  TryOnSource,
  TryOnState,
} from '@/types';
import { InsufficientAICreditsError, isInsufficientAICreditsError } from './productIntelligence';

const endpoint = process.env.EXPO_PUBLIC_TRY_ON_ENDPOINT;
const createJobEndpoint = process.env.EXPO_PUBLIC_TRY_ON_CREATE_JOB_ENDPOINT || deriveTryOnEndpoint('createTryOnJob');
const getJobEndpoint = process.env.EXPO_PUBLIC_TRY_ON_GET_JOB_ENDPOINT || deriveTryOnEndpoint('getTryOnJob');
const defaultTimeoutMs = Number(process.env.EXPO_PUBLIC_TRY_ON_TIMEOUT_MS) || 90000;
const pollIntervalMs = Number(process.env.EXPO_PUBLIC_TRY_ON_POLL_INTERVAL_MS) || 3000;
const tryOnCreditCost = Number(process.env.EXPO_PUBLIC_TRY_ON_CREDIT_COST) || 2;

type TryOnRequestOptions = {
  authToken?: string;
  timeoutMs?: number;
};

export class MockTryOnProvider implements TryOnProvider {
  async generatePreview(input: TryOnInput): Promise<TryOnResult> {
    return { preview: createMockTryOnPreview(input, 'mock') };
  }
}

export class RemoteTryOnProvider implements TryOnProvider {
  constructor(private readonly fallback = new MockTryOnProvider()) {}

  async generatePreview(input: TryOnInput, options: TryOnRequestOptions = {}): Promise<TryOnResult> {
    if (!endpoint && (!createJobEndpoint || !getJobEndpoint)) {
      return this.fallback.generatePreview(input);
    }

    const startedAt = Date.now();
    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

    if (createJobEndpoint && getJobEndpoint) {
      try {
        const jobResult = await createTryOnJob(input, options.authToken);
        const completed = await pollTryOnJob(jobResult.job.id, options.authToken, timeoutMs, startedAt);
        if (!completed.preview) {
          throw new Error(completed.error || 'Try-on job completed without preview.');
        }

        return {
          preview: normalizeTryOnPreview(completed.preview, input, 'remote'),
          buyerCredits: jobResult.buyerCredits,
          diagnostics: {
            endpoint: createJobEndpoint,
            durationMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        if (isInsufficientAICreditsError(error)) {
          throw error;
        }
        return {
          preview: createMockTryOnPreview(input, 'remote-fallback'),
          diagnostics: {
            endpoint: createJobEndpoint,
            durationMs: Date.now() - startedAt,
            fallbackReason: getErrorMessage(error),
          },
        };
      }
    }

    if (!endpoint) {
      return this.fallback.generatePreview(input);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(options.authToken),
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await readResponseText(response);
        if (response.status === 402 && body.includes('insufficient_buyer_ai_credits')) {
          throw new InsufficientAICreditsError('Kabin jetonun yetersiz.');
        }
        throw new Error(`Try-on endpoint failed with ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as Partial<TryOnResult> | Partial<TryOnPreview>;
      const remotePreview = hasPreviewPayload(payload) ? payload.preview : payload;

      return {
        preview: normalizeTryOnPreview(remotePreview, input, 'remote'),
        diagnostics: {
          endpoint,
          durationMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      if (isInsufficientAICreditsError(error)) {
        throw error;
      }
      return {
        preview: createMockTryOnPreview(input, 'remote-fallback'),
        diagnostics: {
          endpoint,
          durationMs: Date.now() - startedAt,
          fallbackReason: getErrorMessage(error),
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const tryOnProvider = new RemoteTryOnProvider();

export function generateTryOn(input: TryOnInput, options?: TryOnRequestOptions) {
  return tryOnProvider.generatePreview(input, options);
}

export function getTryOnCreditCost() {
  return tryOnCreditCost;
}

export function buildTryOnInput(
  product: Product,
  tryOnState: TryOnState,
  modelImageUri: string,
  outfitProductIds: string[] = [],
  modelImageStoragePath?: string,
): TryOnInput {
  return {
    product: {
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      color: product.color,
      category: product.category,
      fit: product.fit,
    },
    mode: tryOnState.mode,
    modelImageUri,
    modelImageStoragePath,
    selectedSize: tryOnState.selectedSize,
    selectedColor: tryOnState.selectedColor,
    environment: tryOnState.environment,
    frameMode: getTryOnFrameMode(product),
    outfitProductIds,
  };
}

export function getTryOnFrameMode(product: Pick<Product, 'category' | 'title'>): TryOnFrameMode {
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

export function getTryOnFrameGuidance(frameMode: TryOnFrameMode) {
  if (frameMode === 'lower_body') return 'Ayaklar ve ayakkabı alanı net görünsün.';
  if (frameMode === 'upper_body') return 'Omuz ve üst beden net görünsün.';
  if (frameMode === 'accessory_focus') return 'Aksesuarın kullanılacağı bölge net görünsün.';
  return 'Tam boy fotoğraf daha iyi sonuç verir.';
}

export function getTryOnFrameLabel(frameMode: TryOnFrameMode) {
  if (frameMode === 'lower_body') return 'Ayak/alt beden kadrajı';
  if (frameMode === 'upper_body') return 'Üst beden kadrajı';
  if (frameMode === 'accessory_focus') return 'Aksesuar kadrajı';
  return 'Tam boy kadraj';
}

export function createMockTryOnPreview(input: TryOnInput, source: TryOnSource = 'mock'): TryOnPreview {
  const fitNote = buildFitNote(input);
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
    fitNote,
    overlayLabel: `${input.selectedColor} / ${input.selectedSize} preview`,
    disclaimer:
      'Bu görsel AI tarafından oluşturulmuş stil önizlemesidir. Gerçek ürün duruşu bedene, kumaşa ve ışığa göre değişebilir.',
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeTryOnPreview(
  preview: Partial<TryOnPreview> | undefined,
  input: TryOnInput,
  source: TryOnSource = 'mock',
): TryOnPreview {
  const fallback = createMockTryOnPreview(input, source);
  if (!preview) return fallback;

  return {
    ...fallback,
    ...preview,
    productId: preview.productId ?? fallback.productId,
    productTitle: preview.productTitle ?? fallback.productTitle,
    productImageUri: preview.productImageUri ?? fallback.productImageUri,
    modelImageUri: preview.modelImageUri ?? fallback.modelImageUri,
    previewImageUri: preview.previewImageUri ?? fallback.previewImageUri,
    environment: preview.environment ?? fallback.environment,
    frameMode: preview.frameMode ?? fallback.frameMode,
    source: preview.source ?? source,
    provider: preview.provider ?? fallback.provider,
    jobId: preview.jobId ?? fallback.jobId,
    previewStoragePath: preview.previewStoragePath ?? fallback.previewStoragePath,
    expiresAt: preview.expiresAt ?? fallback.expiresAt,
    confidence: preview.confidence ?? fallback.confidence,
    disclaimer: preview.disclaimer ?? fallback.disclaimer,
    generatedAt: preview.generatedAt ?? fallback.generatedAt,
  };
}

async function createTryOnJob(input: TryOnInput, authToken?: string): Promise<CreateTryOnJobResult> {
  if (!createJobEndpoint) {
    throw new Error('Try-on job endpoint is not configured.');
  }

  const response = await fetch(createJobEndpoint, {
    method: 'POST',
    headers: buildHeaders(authToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await readResponseText(response);
    if (response.status === 402 && body.includes('insufficient_buyer_ai_credits')) {
      throw new InsufficientAICreditsError('Kabin jetonun yetersiz.');
    }
    throw new Error(`Try-on job creation failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as Partial<CreateTryOnJobResult>;
  if (!payload.job?.id) {
    throw new Error('Try-on job creation response did not include a job id.');
  }

  return {
    job: payload.job,
    buyerCredits: payload.buyerCredits as BuyerCreditAccount | undefined,
  };
}

async function pollTryOnJob(jobId: string, authToken: string | undefined, timeoutMs: number, startedAt: number) {
  if (!getJobEndpoint) {
    throw new Error('Try-on job status endpoint is not configured.');
  }

  while (Date.now() - startedAt < timeoutMs) {
    await delay(pollIntervalMs);
    const response = await fetch(getJobEndpoint, {
      method: 'POST',
      headers: buildHeaders(authToken),
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      throw new Error(`Try-on job status failed with ${response.status}: ${await readResponseText(response)}`);
    }

    const payload = (await response.json()) as { job?: TryOnJob };
    const job = payload.job;
    if (!job) {
      throw new Error('Try-on job status response did not include a job.');
    }

    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(job.error || 'Try-on generation failed.');
  }

  throw new Error('Try-on job timed out.');
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

function getEnvironmentLabel(environment: TryOnInput['environment']) {
  if (environment === 'home') return 'ev';
  if (environment === 'party') return 'parti';
  if (environment === 'office') return 'ofis';
  if (environment === 'holiday') return 'tatil';
  return 'dış mekan';
}

function buildHeaders(authToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

function deriveTryOnEndpoint(name: 'createTryOnJob' | 'getTryOnJob') {
  if (!endpoint) return undefined;
  if (endpoint.endsWith('/tryOnPreview')) {
    return endpoint.replace(/\/tryOnPreview$/, `/${name}`);
  }
  if (endpoint.endsWith('/api/try-on-preview')) {
    const path = name === 'createTryOnJob' ? 'create-try-on-job' : 'get-try-on-job';
    return endpoint.replace(/\/api\/try-on-preview$/, `/api/${path}`);
  }
  return undefined;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return 'No response body';
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.name === 'AbortError' ? 'Try-on endpoint request timed out.' : error.message;
  return 'Try-on endpoint request failed.';
}

function hasPreviewPayload(value: Partial<TryOnResult> | Partial<TryOnPreview>): value is Partial<TryOnResult> {
  return 'preview' in value;
}
