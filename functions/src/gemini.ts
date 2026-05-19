import {
  buildChatRecommendationsFromIntent,
  buildDefaultSearchProfile,
  buildSearchIntentResult,
  CHAT_CATEGORIES,
  CHAT_MODESTY_VALUES,
  CHAT_OCCASION_TAGS,
  CHAT_STYLE_TAGS,
  coerceUserIntent,
} from './chatRecommend';
import {
  buildGeneratedListingFromOverrides,
  PRODUCT_CATEGORIES,
  PRODUCT_FIT_VALUES,
  PRODUCT_MODESTY_LEVELS,
  PRODUCT_OCCASION_TAGS,
  PRODUCT_SEASON_VALUES,
  PRODUCT_STYLE_TAGS,
} from './productIntelligence';
import { geminiApiKeySecret } from './secrets';
import type {
  ChatRecommendInput,
  ChatRecommendResult,
  GeneratedListing,
  ProductIntelligenceInput,
  ProductIntelligenceResult,
  ProductImageEnhancementInput,
  ProductImageEnhancementMode,
  SearchIntentInput,
  SearchIntentResult,
  TryOnInput,
  UserIntent,
} from './types';

type JsonSchema = Record<string, unknown>;

const canonicalColors = ['Siyah', 'Beyaz', 'Mavi', 'Lacivert', 'Krem', 'Bej', 'Nude', 'Pembe', 'Gri', 'Yeşil', 'Altın'] as const;
const fitSynonyms: Array<{ terms: string[]; value: (typeof PRODUCT_FIT_VALUES)[number] }> = [
  { terms: ['regular', 'normal', 'normal kesim', 'standart kesim'], value: 'regular' },
  { terms: ['slim', 'dar'], value: 'slim' },
  { terms: ['oversize', 'oversized', 'bol'], value: 'oversize' },
  { terms: ['structured', 'yapılandırılmış', 'blazer fit'], value: 'structured' },
  { terms: ['standard', 'std'], value: 'standard' },
  { terms: ['wide leg', 'wide-leg', 'geniş paça', 'bol paça'], value: 'wide leg' },
  { terms: ['cropped', 'kısa'], value: 'cropped' },
  { terms: ['relaxed', 'rahat'], value: 'relaxed' },
];
const seasonSynonyms: Array<{ terms: string[]; value: (typeof PRODUCT_SEASON_VALUES)[number] }> = [
  { terms: ['spring', 'ilkbahar'], value: 'spring' },
  { terms: ['summer', 'yaz'], value: 'summer' },
  { terms: ['fall', 'autumn', 'sonbahar'], value: 'fall' },
  { terms: ['winter', 'kış', 'kis'], value: 'winter' },
  { terms: ['all season', 'four season', '4 season', 'dört mevsim', 'tum sezon', 'tüm sezon'], value: 'all season' },
];
type CanonicalSeason = (typeof PRODUCT_SEASON_VALUES)[number];

export function isGeminiEnabled() {
  return Boolean(getGeminiApiKey());
}

export async function generateProductIntelligenceWithGemini(
  input: ProductIntelligenceInput,
): Promise<ProductIntelligenceResult | undefined> {
  if (!isGeminiEnabled()) return undefined;

  const productImage = await loadGeminiImageFromUrl(input.draft.imageUrl);
  const result = await generateStructuredJson<GeminiProductListing>({
    model: getProductModel(),
    taskName: 'product-intelligence',
    temperature: 0.3,
    schema: productListingSchema,
    prompt: buildProductPrompt(input),
    inlineImages: productImage ? [productImage] : undefined,
  });

  return {
    listing: buildGeneratedListingFromOverrides(
      input.draft,
      normalizeGeminiProductListing(result),
      input.variant ?? 0,
      'remote',
    ),
  };
}

export async function generateChatRecommendationsWithGemini(
  input: ChatRecommendInput,
): Promise<ChatRecommendResult | undefined> {
  if (!isGeminiEnabled()) return undefined;

  const result = await generateStructuredJson<GeminiIntentPayload>({
    model: getChatModel(),
    taskName: 'chat-recommend-intent',
    temperature: 0.2,
    schema: intentSchema,
    prompt: buildChatIntentPrompt(input),
  });

  const intent = coerceUserIntent(normalizeGeminiIntentPayload(result), input.prompt, input.profile);
  return buildChatRecommendationsFromIntent(input, intent, 'remote');
}

export async function generateSearchIntentWithGemini(
  input: SearchIntentInput,
): Promise<SearchIntentResult | undefined> {
  if (!isGeminiEnabled()) return undefined;

  const profile = buildDefaultSearchProfile(input.profile);
  const result = await generateStructuredJson<GeminiIntentPayload>({
    model: getSearchModel(),
    taskName: 'search-intent',
    temperature: 0.1,
    schema: intentSchema,
    prompt: buildSearchIntentPrompt(input, profile),
  });

  const intent = coerceUserIntent(normalizeGeminiIntentPayload(result), input.query, profile);
  return buildSearchIntentResult(input.query, profile, intent, 'remote');
}

export async function generateTryOnImageWithGemini(input: {
  tryOnInput: TryOnInput;
  modelImage: GeminiInlineImage;
  productImage: GeminiInlineImage;
}): Promise<GeminiInlineImage | undefined> {
  if (!isGeminiEnabled()) return undefined;

  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured for try-on.');
  }

  const response = await fetch(`${getGeminiApiBaseUrl()}/models/${getTryOnModel()}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildTryOnImagePrompt(input.tryOnInput) },
            {
              inlineData: {
                mimeType: input.modelImage.mimeType,
                data: input.modelImage.data,
              },
            },
            {
              inlineData: {
                mimeType: input.productImage.mimeType,
                data: input.productImage.data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini try-on image request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const imagePart = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini try-on image response did not include image data.');
  }

  return {
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    data: imagePart.inlineData.data,
  };
}

export async function generateProductImageEnhancementWithGemini(input: {
  enhancementInput: ProductImageEnhancementInput;
  productImage: GeminiInlineImage;
}): Promise<GeminiInlineImage | undefined> {
  if (!isGeminiEnabled()) return undefined;

  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured for product image enhancement.');
  }

  const response = await fetch(`${getGeminiApiBaseUrl()}/models/${getProductImageEnhanceModel()}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildProductImageEnhancementPrompt(input.enhancementInput) },
            {
              inlineData: {
                mimeType: input.productImage.mimeType,
                data: input.productImage.data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini product image enhancement request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const imagePart = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini product image enhancement response did not include image data.');
  }

  return {
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    data: imagePart.inlineData.data,
  };
}

async function generateStructuredJson<T>({
  model,
  prompt,
  schema,
  taskName,
  temperature,
  inlineImages,
}: {
  model: string;
  prompt: string;
  schema: JsonSchema;
  taskName: string;
  temperature: number;
  inlineImages?: GeminiInlineImage[];
}): Promise<T> {
  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    throw new Error(`Gemini API key is not configured for ${taskName}.`);
  }

  const response = await fetch(`${getGeminiApiBaseUrl()}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...(inlineImages ?? []).map((image) => ({
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini ${taskName} request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

  if (!text) {
    throw new Error(`Gemini ${taskName} returned an empty response.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Gemini ${taskName} returned invalid JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`,
    );
  }
}

function buildProductPrompt(input: ProductIntelligenceInput) {
  return [
    'You are the product intelligence engine for Chat2Shop, an AI-first fashion marketplace.',
    'Return only valid JSON that matches the schema.',
    'Descriptions, reasoning, and recommendation must be in Turkish.',
    'Use only allowed enum values for category, styleTags, occasionTags, modesty, fit, and season.',
    'Use Turkish canonical color names such as Siyah, Beyaz, Mavi, Lacivert, Krem, Bej, Nude, Pembe, Gri, Yeşil, Altın.',
    'Prefer concise, commercially useful metadata.',
    'The attached image is the primary source of truth for visible product type, dominant color, texture, pattern, and silhouette.',
    'Treat seller draft text as helpful hints, but if draft text conflicts with the image, prefer the image.',
    'If you detect a conflict between image and draft hints, briefly mention it in Turkish in reasoning or recommendation.',
    'Do not invent a different color, category, or product type than what is visibly shown.',
    '',
    `Allowed category values: ${PRODUCT_CATEGORIES.join(', ')}`,
    `Allowed styleTags values: ${PRODUCT_STYLE_TAGS.join(', ')}`,
    `Allowed occasionTags values: ${PRODUCT_OCCASION_TAGS.join(', ')}`,
    `Allowed modesty values: ${PRODUCT_MODESTY_LEVELS.join(', ')}`,
    `Allowed fit values: ${PRODUCT_FIT_VALUES.join(', ')}`,
    `Allowed season values: ${PRODUCT_SEASON_VALUES.join(', ')}`,
    '',
    `Seller draft JSON: ${JSON.stringify(input.draft)}`,
    `Previous listing JSON: ${JSON.stringify(input.previousListing ?? {})}`,
    `Variant: ${input.variant ?? 0}`,
    '',
    'Generate a fashion marketplace listing with strong searchability.',
    'Use 4-6 aiSearchIntents and 4-8 keywords.',
    'If the attached image is unavailable or unreadable, rely on the draft text and marketplace context.',
  ].join('\n');
}

async function loadGeminiImageFromUrl(url: string): Promise<GeminiInlineImage | undefined> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl || normalizedUrl.startsWith('file:')) return undefined;

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Product image download failed with ${response.status}.`);
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw new Error(`Product image URL must return an image, got ${mimeType}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error('Product image exceeds 8MB.');
  }

  return {
    mimeType,
    data: buffer.toString('base64'),
  };
}

function buildChatIntentPrompt(input: ChatRecommendInput) {
  const candidatePreview = (input.candidates ?? []).slice(0, 8).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    category: candidate.category,
    color: candidate.color,
    price: candidate.price,
    occasionTags: candidate.occasionTags,
    styleTags: candidate.styleTags,
    modesty: candidate.modesty,
  }));

  return [
    'You extract shopping intent for Chat2Shop.',
    'Return only valid JSON that matches the schema.',
    'The rawText must equal the user prompt.',
    'Use only allowed enum values for occasion and styles.',
    'Color must use Turkish canonical values such as Siyah, Beyaz, Mavi, Lacivert, Krem, Bej, Nude, Pembe, Gri, Yeşil, Altın.',
    'fitPreference should prefer canonical values like regular, slim, oversize, structured, standard, wide leg, cropped, relaxed.',
    'If a field is not clear, omit it.',
    '',
    `Allowed occasion values: ${CHAT_OCCASION_TAGS.join(', ')}`,
    `Allowed style values: ${CHAT_STYLE_TAGS.join(', ')}`,
    `Allowed modesty values: ${CHAT_MODESTY_VALUES.join(', ')}`,
    '',
    `Profile JSON: ${JSON.stringify(input.profile)}`,
    `User prompt: ${input.prompt}`,
    `Candidate preview JSON: ${JSON.stringify(candidatePreview)}`,
  ].join('\n');
}

function buildSearchIntentPrompt(input: SearchIntentInput, profile: ReturnType<typeof buildDefaultSearchProfile>) {
  return [
    'You extract structured search intent for Chat2Shop catalog search.',
    'Return only valid JSON that matches the schema.',
    'The rawText must equal the search query.',
    'Infer fashion category, color, style, budget, modesty, size, and fit if the query strongly signals them.',
    'Use only allowed enum values for occasion and styles.',
    'Color must use Turkish canonical values such as Siyah, Beyaz, Mavi, Lacivert, Krem, Bej, Nude, Pembe, Gri, Yeşil, Altın.',
    'fitPreference should prefer canonical values like regular, slim, oversize, structured, standard, wide leg, cropped, relaxed.',
    '',
    `Allowed categories: ${CHAT_CATEGORIES.join(', ')}`,
    `Allowed occasion values: ${CHAT_OCCASION_TAGS.join(', ')}`,
    `Allowed style values: ${CHAT_STYLE_TAGS.join(', ')}`,
    `Allowed modesty values: ${CHAT_MODESTY_VALUES.join(', ')}`,
    '',
    `Profile JSON: ${JSON.stringify(profile)}`,
    `Search query: ${input.query}`,
  ].join('\n');
}

type GeminiIntentPayload = Partial<UserIntent>;

type GeminiProductListing = {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  keywords?: string[];
  category?: string;
  styleTags?: string[];
  vibeTags?: string[];
  occasionTags?: string[];
  color?: string;
  fit?: string;
  modesty?: string;
  season?: string[];
  aiSearchIntents?: string[];
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  recommendation?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
};

export type GeminiInlineImage = {
  mimeType: string;
  data: string;
};

const stringArraySchema = {
  type: 'array',
  items: { type: 'string' },
};

function normalizeGeminiIntentPayload(value: GeminiIntentPayload): Partial<UserIntent> {
  return {
    rawText: normalizeNonEmptyString(value.rawText),
    category: normalizeCategory(value.category),
    occasion: normalizeOccasion(value.occasion),
    color: normalizeColor(value.color),
    styles: normalizeStyleTags(value.styles),
    budgetMax: normalizeBudget(value.budgetMax),
    modesty: normalizeIntentModesty(value.modesty),
    size: normalizeSize(value.size),
    fitPreference: normalizeFit(value.fitPreference),
  };
}

function normalizeGeminiProductListing(value: GeminiProductListing): Partial<GeneratedListing> {
  return {
    title: normalizeNonEmptyString(value.title),
    shortDescription: normalizeNonEmptyString(value.shortDescription),
    longDescription: normalizeNonEmptyString(value.longDescription),
    keywords: normalizeLooseStringArray(value.keywords, 10),
    category: normalizeCategory(value.category),
    styleTags: normalizeStyleTags(value.styleTags),
    vibeTags: normalizeLooseStringArray(value.vibeTags, 8),
    occasionTags: normalizeOccasionTags(value.occasionTags),
    color: normalizeColor(value.color),
    fit: normalizeFit(value.fit),
    modesty: normalizeProductModesty(value.modesty),
    season: normalizeSeasons(value.season),
    aiSearchIntents: normalizeLooseStringArray(value.aiSearchIntents, 8),
    confidence: normalizeConfidence(value.confidence),
    reasoning: normalizeNonEmptyString(value.reasoning),
    recommendation: normalizeNonEmptyString(value.recommendation),
  };
}

function getGeminiApiKey() {
  try {
    const secretValue = geminiApiKeySecret.value();
    if (secretValue) {
      return secretValue;
    }
  } catch {
    // Secret is unavailable outside bound function runtimes; fall back to process.env for local dev/tests.
  }

  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

function getGeminiApiBaseUrl() {
  return process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
}

function getProductModel() {
  return process.env.GEMINI_PRODUCT_INTELLIGENCE_MODEL || 'gemini-2.5-flash';
}

function getChatModel() {
  return process.env.GEMINI_CHAT_RECOMMEND_MODEL || 'gemini-2.5-flash';
}

function getSearchModel() {
  return process.env.GEMINI_SEARCH_INTENT_MODEL || 'gemini-2.5-flash';
}

function getTryOnModel() {
  return process.env.GEMINI_TRY_ON_MODEL || 'gemini-3.1-flash-image-preview';
}

function getProductImageEnhanceModel() {
  return process.env.GEMINI_PRODUCT_IMAGE_ENHANCE_MODEL || process.env.GEMINI_TRY_ON_MODEL || 'gemini-3.1-flash-image-preview';
}

function buildProductImageEnhancementPrompt(input: ProductImageEnhancementInput) {
  const context = input.draftContext ?? {};
  const mode = getProductImageEnhancementModePrompt(input.mode);
  return [
    'You are Chat2Shop professional e-commerce product photo editor.',
    'Use the provided image as the only product reference.',
    `Selected enhancement mode: ${mode.label}.`,
    mode.prompt,
    'Improve lighting, crop, contrast, background cleanliness, and marketplace presentation quality.',
    'Strict preservation rules:',
    '- Preserve the original product category, silhouette, color, fabric impression, proportions, prints, closures, trims, and distinctive details.',
    '- Do not turn the product into another garment, accessory, material, color, or pattern.',
    '- Do not invent a brand, logo, label text, watermark, model, person, mannequin, body, face, hands, hanger, prop, or extra accessory.',
    '- Do not create nudity, explicit content, body-revealing transformations, or sexualized presentation.',
    '- Keep the output realistic, commercial, clean, and suitable for a fashion marketplace product listing.',
    `Optional seller name hint: ${context.optionalName ?? ''}`,
    `Optional category hint: ${context.optionalCategory ?? ''}`,
    `Seller price: ${context.price ?? ''}`,
    'Return one image only.',
  ].join('\n');
}

function getProductImageEnhancementModePrompt(mode: ProductImageEnhancementMode) {
  const prompts: Record<ProductImageEnhancementMode, { label: string; prompt: string }> = {
    catalog_white: {
      label: 'Catalog White',
      prompt:
        'Create a clean white or very light gray seamless e-commerce catalog image. Center the product clearly, use crisp catalog lighting, realistic soft shadow, straight product presentation, and no distracting background elements.',
    },
    premium_studio: {
      label: 'Premium Studio',
      prompt:
        'Create a premium boutique studio product photo with soft studio lighting, neutral warm background, subtle depth, polished realism, refined crop, and natural shadow. The result should feel upscale but still catalog-ready.',
    },
    editorial_minimal: {
      label: 'Editorial Minimal',
      prompt:
        'Create a minimal fashion editorial product composition with a calm refined background, tasteful negative space, balanced crop, and product-first framing. Keep the image understated and avoid props or scene clutter.',
    },
    lifestyle_commerce: {
      label: 'Lifestyle Commerce',
      prompt:
        'Create a tasteful e-commerce lifestyle product image in a clean modern environment with natural light and warm commercial styling. Keep the product as the only item of focus and do not add outfit styling or new accessories.',
    },
  };

  return prompts[mode] ?? prompts.catalog_white;
}

function buildTryOnImagePrompt(input: TryOnInput) {
  return [
    'You are Chat2Shop virtual fitting preview engine.',
    'Use the first image as the user/model reference and the second image as the product reference.',
    'Create a realistic fashion styling preview where the person in the first image wears the exact product from the second image.',
    'The second image is the source of truth for the garment. The product must remain visually recognizable.',
    'Preserve the person identity, face, body proportions, pose, and skin tone. Do not alter body shape.',
    'Strict garment preservation rules:',
    '- Preserve the product category, silhouette, length, neckline, sleeve shape, waist shape, drape, fabric impression, closures, trims, print/pattern, texture, and distinctive details from the second image.',
    '- Do not invent floral prints, graphics, buttons, belts, bags, hats, accessories, logos, labels, or decorative elements that are not visible in the product image.',
    '- Do not convert a plain garment into a patterned garment, a patterned garment into a plain garment, a dress into a jumpsuit, a coat into a dress, or any product into a different product.',
    '- If the requested color or environment conflicts with the second image, prioritize preserving the second image over the request.',
    '- The selected color may only be used as a subtle color-family hint when it matches the actual product image; never recolor the garment into a different product variant.',
    '- The environment may change only the background and lighting, not the garment design.',
    'Do not create nudity, underwear-only output, explicit content, or body-revealing transformations.',
    'Keep the result suitable for an e-commerce style preview, not a medical or tailoring-grade fit simulation.',
    `Product title: ${input.product.title}`,
    `Product category: ${input.product.category}`,
    `Product fit: ${input.product.fit}`,
    `Product catalog color: ${input.product.color}`,
    `Requested color: ${input.selectedColor || input.product.color}`,
    `Environment: ${getTryOnEnvironmentDescription(input.environment)}`,
    `Required framing: ${getTryOnFrameInstruction(input)}`,
    'Quality check before returning: the generated outfit should be identifiable as the same product from the second image.',
    'Quality check before returning: the selected framing must show the relevant product area completely, without cropping the hem, shoes, sleeves, neckline, handle, or key product details.',
    'Return one image only.',
  ].join('\n');
}

function getTryOnFrameInstruction(input: TryOnInput) {
  const frameMode = input.frameMode ?? inferTryOnFrameMode(input);
  if (frameMode === 'lower_body') {
    return [
      'lower-body and feet framing',
      'show the lower legs, feet, and footwear area clearly',
      'do not crop out shoes, soles, toes, heels, ankles, or the bottom of the product',
    ].join('; ');
  }
  if (frameMode === 'upper_body') {
    return [
      'upper-body fashion framing',
      'show shoulders, neckline, sleeves, torso, and waist clearly',
      'do not crop out collars, cuffs, sleeves, chest, waist details, or jacket/shirt edges',
    ].join('; ');
  }
  if (frameMode === 'accessory_focus') {
    return [
      'accessory-focused commercial framing',
      'show the relevant carry or wear position clearly',
      'do not crop out handles, straps, clasps, hardware, pattern, or the main accessory shape',
    ].join('; ');
  }
  return [
    'full-body fashion framing',
    'show the person from head to toe when possible',
    'show garment hem, skirt/pant length, legs, and feet clearly',
    'do not crop out the bottom of dresses, pants, coats, or long garments',
  ].join('; ');
}

function inferTryOnFrameMode(input: TryOnInput) {
  const title = input.product.title.toLocaleLowerCase('tr-TR');
  if (input.product.category === 'shoes' || /\b(ayakkabı|sneaker|bot|çizme|loafer|topuklu|sandalet)\b/u.test(title)) {
    return 'lower_body';
  }
  if (
    input.product.category === 'bag' ||
    input.product.category === 'accessory' ||
    /\b(çanta|bag|aksesuar|fular|şal|kemer|takı|kolye|küpe)\b/u.test(title)
  ) {
    return 'accessory_focus';
  }
  if (
    input.product.category === 'dress' ||
    input.product.category === 'pants' ||
    /\b(elbise|abiye|tulum|pantolon|jean|etek|kaban|trenç|trench|pardösü|maxi|midi|gown)\b/u.test(title)
  ) {
    return 'full_body';
  }
  return 'upper_body';
}

function getTryOnEnvironmentDescription(environment: TryOnInput['environment']) {
  if (environment === 'home') return 'clean home mirror or indoor styling setting';
  if (environment === 'party') return 'tasteful evening party styling setting';
  if (environment === 'office') return 'modern office or smart-casual work setting';
  if (environment === 'holiday') return 'bright holiday or vacation setting';
  return 'natural outdoor street-style setting';
}

const intentSchema: JsonSchema = {
  type: 'object',
  properties: {
    rawText: { type: 'string' },
    category: { type: 'string', enum: CHAT_CATEGORIES },
    occasion: { type: 'string', enum: CHAT_OCCASION_TAGS },
    color: { type: 'string' },
    styles: {
      type: 'array',
      items: { type: 'string', enum: CHAT_STYLE_TAGS },
    },
    budgetMax: { type: 'integer' },
    modesty: { type: 'string', enum: CHAT_MODESTY_VALUES },
    size: { type: 'string' },
    fitPreference: { type: 'string' },
  },
  required: ['rawText', 'styles'],
};

const productListingSchema: JsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    shortDescription: { type: 'string' },
    longDescription: { type: 'string' },
    keywords: stringArraySchema,
    category: { type: 'string', enum: PRODUCT_CATEGORIES },
    styleTags: {
      type: 'array',
      items: { type: 'string', enum: PRODUCT_STYLE_TAGS },
    },
    vibeTags: stringArraySchema,
    occasionTags: {
      type: 'array',
      items: { type: 'string', enum: PRODUCT_OCCASION_TAGS },
    },
    color: { type: 'string' },
    fit: { type: 'string', enum: PRODUCT_FIT_VALUES },
    modesty: { type: 'string', enum: PRODUCT_MODESTY_LEVELS },
    season: {
      type: 'array',
      items: { type: 'string', enum: PRODUCT_SEASON_VALUES },
    },
    aiSearchIntents: stringArraySchema,
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    recommendation: { type: 'string' },
  },
  required: [
    'title',
    'shortDescription',
    'longDescription',
    'keywords',
    'category',
    'styleTags',
    'vibeTags',
    'occasionTags',
    'color',
    'fit',
    'modesty',
    'season',
    'aiSearchIntents',
    'confidence',
    'reasoning',
    'recommendation',
  ],
};

function normalizeCategory(value: unknown): GeneratedListing['category'] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('dress') || normalized.includes('elbise')) return 'dress';
  if (normalized.includes('shirt') || normalized.includes('gömlek') || normalized.includes('gomlek')) return 'shirt';
  if (normalized.includes('pants') || normalized.includes('pantolon')) return 'pants';
  if (normalized.includes('jacket') || normalized.includes('ceket') || normalized.includes('blazer')) return 'jacket';
  if (normalized.includes('shoe') || normalized.includes('sneaker') || normalized.includes('ayakkabi') || normalized.includes('ayakkabı')) return 'shoes';
  if (normalized.includes('bag') || normalized.includes('çanta') || normalized.includes('canta')) return 'bag';
  if (normalized.includes('accessory') || normalized.includes('aksesuar')) return 'accessory';
  return undefined;
}

function normalizeColor(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  const entries: Array<{ terms: string[]; value: (typeof canonicalColors)[number] }> = [
    { terms: ['siyah', 'black'], value: 'Siyah' },
    { terms: ['beyaz', 'white'], value: 'Beyaz' },
    { terms: ['mavi', 'blue'], value: 'Mavi' },
    { terms: ['lacivert', 'navy'], value: 'Lacivert' },
    { terms: ['krem', 'cream'], value: 'Krem' },
    { terms: ['bej', 'beige'], value: 'Bej' },
    { terms: ['nude'], value: 'Nude' },
    { terms: ['pembe', 'pink'], value: 'Pembe' },
    { terms: ['gri', 'gray', 'grey'], value: 'Gri' },
    { terms: ['yeşil', 'yesil', 'green'], value: 'Yeşil' },
    { terms: ['altın', 'altin', 'gold'], value: 'Altın' },
  ];
  return entries.find((entry) => entry.terms.some((term) => normalized.includes(term)))?.value;
}

function normalizeStyleTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => normalizeStyleTag(item))
    .filter((item): item is GeneratedListing['styleTags'][number] => Boolean(item));
  return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 4) : undefined;
}

function normalizeStyleTag(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('minimal') || normalized.includes('sade')) return 'minimal';
  if (normalized.includes('elegant') || normalized.includes('şık') || normalized.includes('sik') || normalized.includes('zarif')) return 'elegant';
  if (normalized.includes('classic') || normalized.includes('klasik')) return 'classic';
  if (normalized.includes('smart casual') || normalized.includes('profesyonel')) return 'smart casual';
  if (normalized.includes('street')) return 'streetwear';
  if (normalized.includes('casual') || normalized.includes('rahat')) return 'casual';
  if (normalized.includes('sport')) return 'sporty';
  if (normalized.includes('modest') || normalized.includes('kapalı') || normalized.includes('kapali')) return 'modest';
  if (normalized.includes('bohemian') || normalized.includes('bohem')) return 'bohemian';
  if (normalized.includes('vintage')) return 'vintage';
  if (normalized.includes('old money')) return 'old money';
  if (normalized.includes('clean girl')) return 'clean girl';
  return undefined;
}

function normalizeOccasionTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => normalizeOccasion(item))
    .filter((item): item is GeneratedListing['occasionTags'][number] => Boolean(item));
  return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 4) : undefined;
}

function normalizeOccasion(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('graduation') || normalized.includes('mezuniyet')) return 'graduation';
  if (normalized.includes('evening') || normalized.includes('aksam') || normalized.includes('akşam') || normalized.includes('gece')) return 'evening';
  if (normalized.includes('wedding') || normalized.includes('guest') || normalized.includes('davet') || normalized.includes('düğün') || normalized.includes('dugun')) return 'wedding guest';
  if (normalized.includes('office') || normalized.includes('ofis') || normalized === 'iş' || normalized === 'is') return 'office';
  if (normalized.includes('daily') || normalized.includes('günlük') || normalized.includes('gunluk')) return 'daily';
  if (normalized.includes('holiday') || normalized.includes('tatil')) return 'holiday';
  if (normalized.includes('summer') || normalized === 'yaz') return 'summer';
  if (normalized.includes('dinner') || normalized.includes('yemek')) return 'dinner';
  if (normalized.includes('sport') || normalized.includes('spor')) return 'sport';
  if (normalized.includes('weekend') || normalized.includes('hafta sonu')) return 'weekend';
  return undefined;
}

function normalizeProductModesty(value: unknown): GeneratedListing['modesty'] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('medium-high') || normalized.includes('orta-yüksek') || normalized.includes('orta yuksek')) return 'medium-high';
  if (normalized === 'high' || normalized.includes('yüksek') || normalized.includes('yuksek')) return 'high';
  if (normalized === 'medium' || normalized.includes('orta')) return 'medium';
  if (normalized === 'low' || normalized.includes('düşük') || normalized.includes('dusuk')) return 'low';
  return undefined;
}

function normalizeIntentModesty(value: unknown): UserIntent['modesty'] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('not too revealing') || normalized.includes('çok açık olmasın') || normalized.includes('cok acik olmasin')) return 'not too revealing';
  if (normalized.includes('balanced') || normalized.includes('denge')) return 'balanced';
  if (normalized.includes('bold') || normalized.includes('iddialı') || normalized.includes('iddiali')) return 'bold';
  return undefined;
}

function normalizeFit(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  return fitSynonyms.find((entry) => entry.terms.some((term) => normalized.includes(term)))?.value;
}

function normalizeSeasons(value: unknown): CanonicalSeason[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => normalizeSeason(item))
    .filter((item): item is CanonicalSeason => Boolean(item));
  return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 5) : undefined;
}

function normalizeSeason(value: unknown): CanonicalSeason | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeText(value);
  return seasonSynonyms.find((entry) => entry.terms.some((term) => normalized.includes(term)))?.value;
}

function normalizeLooseStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, limit) : undefined;
}

function normalizeConfidence(value: unknown): GeneratedListing['confidence'] | undefined {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return undefined;
}

function normalizeBudget(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d{3,6})/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function normalizeSize(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return undefined;
  return normalized;
}

function normalizeNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase('tr-TR');
}
