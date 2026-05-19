import { defaultProfile, products, sampleSellerDraft } from '../src/data/mockData';
import { buildComparisonRows, recommendProducts } from '../src/services/ai';
import { getFitRecommendation } from '../src/services/fit';
import { generateProductIntelligence } from '../src/services/productIntelligence';
import { generatedListingToProduct } from '../src/services/sellerProduct';

const prompt = 'Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın.';

async function main() {
  const result = recommendProducts(prompt, defaultProfile, products);

  if (products.length < 20) {
    throw new Error(`Expected at least 20 products, got ${products.length}`);
  }

  if (result.recommendations.length === 0) {
    throw new Error('Expected recommendation results');
  }

  const top = result.recommendations[0];
  if (top.product.id !== 'black-midi-dress') {
    throw new Error(`Expected black-midi-dress as top result, got ${top.product.id}`);
  }

  const coveredResult = recommendProducts('Mezuniyet için kapalı bir elbise öner.', defaultProfile, products);
  const coveredTop = coveredResult.recommendations[0];
  if (coveredResult.intent.category !== 'dress') {
    throw new Error(`Expected covered prompt to parse dress category, got ${coveredResult.intent.category}`);
  }
  if (coveredResult.intent.modesty !== 'not too revealing') {
    throw new Error(`Expected covered prompt to parse modesty, got ${coveredResult.intent.modesty}`);
  }
  if (!coveredTop || coveredTop.product.category !== 'dress') {
    throw new Error(`Expected covered prompt top result to be a dress, got ${coveredTop?.product.category}`);
  }
  if (!['medium-high', 'high'].includes(coveredTop.product.modesty)) {
    throw new Error(`Expected covered prompt top result to be modest, got ${coveredTop.product.modesty}`);
  }

  if (top.matchScore < 85) {
    throw new Error(`Expected top match score >= 85, got ${top.matchScore}`);
  }

  const listing = (await generateProductIntelligence({ draft: sampleSellerDraft })).listing;
  if (listing.visibilityScore < 80) {
    throw new Error(`Expected listing visibility score >= 80, got ${listing.visibilityScore}`);
  }

  if (!listing.category || !listing.modesty || listing.season.length === 0) {
    throw new Error('Expected listing to include category, modesty and season metadata');
  }

  if (!listing.reasoning || !listing.visibilityScoreBreakdown.metadataDepth) {
    throw new Error('Expected listing reasoning and visibility score breakdown');
  }

  const variantListing = (await generateProductIntelligence({ draft: sampleSellerDraft, variant: 1 })).listing;
  if (variantListing.title === listing.title && variantListing.color === listing.color) {
    throw new Error('Expected regenerate variant to produce a controlled variation');
  }

  const fit = getFitRecommendation(top.product, defaultProfile);
  if (fit.recommendedSize !== 'M') {
    throw new Error(`Expected M fit recommendation, got ${fit.recommendedSize}`);
  }

  const rows = buildComparisonRows(result.recommendations, defaultProfile);
  if (rows.length !== 3 || rows[0].productId !== top.product.id) {
    throw new Error('Expected three comparison rows with top product first');
  }

  const sellerProduct = generatedListingToProduct(listing, sampleSellerDraft);
  if (sellerProduct.visibilityScore !== listing.visibilityScore || sellerProduct.sizes.length === 0) {
    throw new Error('Expected generated seller product to preserve visibility and sizes');
  }

  if (
    sellerProduct.category !== listing.category ||
    sellerProduct.modesty !== listing.modesty ||
    sellerProduct.season[0] !== listing.season[0]
  ) {
    throw new Error('Expected generated seller product to preserve intelligence metadata');
  }

  console.log(
    `AI smoke passed: ${top.product.title} scored ${top.matchScore}, fit ${fit.recommendedSize}, comparison rows ${rows.length}, listing visibility ${listing.visibilityScore}, AI source ${listing.aiSource}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
