import { products } from '../src/data/mockData';
import { buildTryOnInput } from '../src/services/tryOn';
import { CreateTryOnJobResult, TryOnJob } from '../src/types';

const endpoint = process.env.EXPO_PUBLIC_TRY_ON_ENDPOINT;
const createJobEndpoint =
  process.env.EXPO_PUBLIC_TRY_ON_CREATE_JOB_ENDPOINT || endpoint?.replace(/\/tryOnPreview$/, '/createTryOnJob');
const getJobEndpoint =
  process.env.EXPO_PUBLIC_TRY_ON_GET_JOB_ENDPOINT || endpoint?.replace(/\/tryOnPreview$/, '/getTryOnJob');
const timeoutMs = Number(process.env.EXPO_PUBLIC_TRY_ON_TIMEOUT_MS) || 90000;
const pollIntervalMs = Number(process.env.EXPO_PUBLIC_TRY_ON_POLL_INTERVAL_MS) || 3000;

async function main() {
  if (!createJobEndpoint || !getJobEndpoint) {
    console.log('Try-on endpoint smoke skipped: try-on job endpoints are not set.');
    return;
  }

  if (!process.env.FIREBASE_ID_TOKEN) {
    console.log('Try-on endpoint smoke skipped: FIREBASE_ID_TOKEN is required for auth-protected live endpoints.');
    return;
  }

  const product = products[0];
  const input = buildTryOnInput(
    product,
    {
      mode: 'avatar',
      avatarUri: 'https://example.com/avatar.jpg',
      selectedSize: product.sizes[0],
      selectedColor: product.color,
      environment: 'outdoor',
    },
    'https://example.com/avatar.jpg',
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(createJobEndpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Expected 200 OK, got ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as CreateTryOnJobResult;
    const job = payload.job;

    if (!job?.id) {
      throw new Error('Expected CreateTryOnJobResult.job.id');
    }

    const completed = await pollJob(job.id, Date.now());
    const preview = completed.preview;
    if (!preview) {
      throw new Error('Completed try-on job did not include preview.');
    }

    if (preview.productId !== product.id || !preview.previewImageUri || !preview.fitNote) {
      throw new Error('Expected remote try-on preview product, preview image and fit note');
    }

    console.log(
      `Try-on endpoint smoke passed: ${preview.productTitle}, size ${preview.selectedSize}, source ${preview.source}.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function pollJob(jobId: string, startedAt: number): Promise<TryOnJob> {
  while (Date.now() - startedAt < timeoutMs) {
    await delay(pollIntervalMs);
    const response = await fetch(getJobEndpoint as string, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      throw new Error(`Expected job status 200 OK, got ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as { job?: TryOnJob };
    if (!payload.job) {
      throw new Error('Expected job status payload.');
    }
    if (payload.job.status === 'completed') {
      if (!payload.job.preview) {
        throw new Error('Completed try-on job did not include preview.');
      }
      return payload.job;
    }
    if (payload.job.status === 'failed') {
      throw new Error(`Try-on job failed: ${payload.job.error ?? 'unknown error'}`);
    }
  }

  throw new Error('Timed out waiting for try-on job.');
}

function buildHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.FIREBASE_ID_TOKEN) {
    headers.Authorization = `Bearer ${process.env.FIREBASE_ID_TOKEN}`;
  }
  return headers;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
