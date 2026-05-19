# AI ve Backend

## Genel Yaklaşım

Chat2Shop'ta AI çağrıları mobil uygulamadan doğrudan modele gitmez. Mobil app Firebase ID token ile Cloud Functions endpointlerini çağırır. Functions tarafı Gemini API key'i secret olarak kullanır, input validation yapar, gerekiyorsa Firestore/Storage işlemlerini tamamlar ve structured response döner.

Endpoint hata/timeout verdiğinde mobil tarafta kullanıcı akışını bozmayan local fallbackler korunur. Fallback sonuçları gerçek AI çıktısı gibi sunulmamalıdır.

## Functions Endpointleri

### AI ve Search

- `productIntelligence`: ürün görseli ve temel draft bilgisinden listing metadata üretir.
- `enhanceProductImage`: ürün fotoğrafını seçilen moda göre profesyonel e-ticaret görseline dönüştürür.
- `chatRecommend`: chat prompt'undan intent çıkarır, Internal Search Engine v2 ile ürün önerir.
- `catalogSearch`: katalog araması ve filtreli listing sonuçları üretir.
- `searchIntent`: query'yi kategori, renk, bütçe, stil ve occasion sinyallerine ayrıştırır.

### Product ve Commerce

- `publishProduct`: seller ürününü backend validation sonrası `active` olarak publish eder.
- `commitCheckout`: buyer checkout commit, order snapshot, seller order ve stok düşümü.
- `submitProductReview`: satın alınmış ürüne yorum/rating kaydeder ve varsa reward verir.
- `submitFitFeedback`: satın alınmış ürün için fit feedback kaydeder ve varsa reward verir.
- `updateReturnRequestStatus`: iade talebi durumunu yetkiye göre günceller.

### Credit

- `buyerCreditSummary`
- `buyerCreditCenter`
- `claimBuyerCampaignReward`
- `sellerCreditSummary`
- `sellerCreditPackages`
- `purchaseSellerCreditPackage`

### Try-On

- `createTryOnJob`: Kabin AI job başlatır.
- `getTryOnJob`: job status/result döner.
- `tryOnPreview`: geriye uyumlu preview endpointi.
- `processTryOnJob`: Firestore trigger ile async Gemini image generation çalıştırır.
- `cleanupTryOnAssets`: süreli try-on asset cleanup job'ı.

## Gemini Kullanımı

Varsayılan model rolleri:

- Product intelligence: `gemini-2.5-flash`
- Chat recommend: `gemini-2.5-flash`
- Search intent: `gemini-2.5-flash`
- Product image enhance: `gemini-3.1-flash-image-preview`
- Try-on image: `gemini-3.1-flash-image-preview`

Model adları env ile override edilebilir. Gerçek API key repo veya mobile env içine yazılmaz.

## Internal Search Engine v2

Algolia kullanılmaz. Search akışı Firestore kaynaklı internal retrieval ve deterministic ranking ile çalışır.

Ranking sinyalleri:

- Query/intent eşleşmesi.
- Kategori, renk, beden, style, vibe ve occasion eşleşmesi.
- Bütçe uyumu.
- AI visibility.
- Seller reliability.
- Anchor product ve follow-up mode boost'ları.
- Synonym/variant normalization.

Archived ürünler public search/chat sonucuna girmez.

## Product Intelligence

Seller ürün yüklerken:

1. Görsel, fiyat, stok ve beden bilgisi girer.
2. `productIntelligence` endpointi ürün adı, açıklama, kategori, renk, fit, modesty, sezon, tag ve search intent üretir.
3. Başarılı üretimde 1 seller jetonu düşer.
4. AI başarısız olursa satıcı manuel listing baseline ile devam edebilir; bu durumda jeton düşmez.

## Product Image Enhance

Satıcı ana ürün görselini 5 jeton karşılığı profesyonelleştirebilir. Modlar:

- `catalog_white`
- `premium_studio`
- `editorial_minimal`
- `lifestyle_commerce`

Her istek tek görsel üretir. Sonuç doğrudan draft'a yazılmaz; satıcı önizler, onaylarsa ürün görseli olarak kullanır.

## Chat Recommendation

Chat akışı server-side çalışır:

1. Prompt ve profil backend'e gönderilir.
2. Gemini intent parse üretir.
3. Internal Search Engine candidate set çıkarır.
4. Deterministic ranking sonuçları sıralar.
5. Gemini veya fallback explanation döner.

Mobil endpoint hata verirse local recommendation fallback çalışır.

## Try-On

Kabin akışı async job modelindedir:

1. Kullanıcı fotoğraf seçer veya çeker.
2. Ürün ve ortam seçer.
3. `createTryOnJob` çağrılır.
4. Backend job oluşturur; Gemini image generation sonucu Storage'a yazar.
5. Mobil app `getTryOnJob` ile polling yapar.

Try-on prompt'u ürünün rengini, desenini, kesimini, uzunluğunu, yaka/kol formunu ve orijinal görünümünü korumaya odaklanır. Ürün tipine göre kadraj modu uygulanır:

- `full_body`: elbise, pantolon, uzun kaban.
- `upper_body`: tişört, gömlek, blazer, ceket.
- `lower_body`: ayakkabı, sneaker, bot.
- `accessory_focus`: çanta ve aksesuar.

## Limitler ve Güvenlik

- Chat günlük ücretsiz limit: 250 istek.
- Seller AI metadata üretimi: 1 jeton.
- Seller product image enhance: 5 jeton.
- Buyer Kabin denemesi: 2 jeton.
- Buyer welcome balance: 10 jeton.
- Seller welcome balance: 20 jeton.

Production için açık güvenlik backlog'u:

- App Check.
- Kalıcı store'a bağlı rate limit.
- Content moderation.
- AI kalite benchmark setleri.
- Try-on consent ve veri silme UI'ı.

