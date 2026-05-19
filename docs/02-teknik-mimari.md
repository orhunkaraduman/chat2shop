# Teknik Mimari

## Genel Yapı

Repo iki ana uygulama katmanından oluşur:

- `mobile/`: Expo Router tabanlı React Native uygulaması.
- `functions/`: Firebase Cloud Functions backend katmanı.
- `firebase/`: Firestore ve Storage rules dosyaları ile emulator test altyapısı.
- `docs/`: sadeleştirilmiş proje dokümantasyonu.

Firebase aktif olduğunda ürün, sipariş, mağaza, kredi, AI ve try-on işlemleri backend kaynaklı çalışır. Firebase config yoksa uygulama geliştirme/demo amaçlı local fallback davranışını korur.

## Mobile App

Mobil uygulama Expo Router kullanır. Ana buyer tabları:

- `Keşfet`
- `Chat`
- `Kabin`
- `Sepet`
- `Profil`

Seller rolünde tab yapısı değişir:

- `Panel`
- `Ürünler`
- `Siparişler`
- `Mağaza`

Uygulama state'i ağırlıklı olarak `mobile/src/state/AppContext.tsx` içinde tutulur. Repository katmanı Firebase ve local implementation ayrımını yönetir. AsyncStorage, Firebase kapalı dev/demo modunda ve bazı local tercihler için fallback olarak kullanılır.

## Design Token Sistemi

Görsel sistem `mobile/src/theme.ts` içindeki semantik tokenlarla yönetilir. Ana marka rengi koyu ink kalır; ekranları canlandıran renkler işlevlerine göre ayrılır:

- `ai / aiSoft`: Chat2Shop AI sinyalleri, metadata, öneri ve match bilgileri.
- `commerce / commerceSoft`: sepete ekleme, satın alma, checkout ve publish aksiyonları.
- `tryOn / tryOnSoft`: Kabin, try-on ve deneme aksiyonları.
- `reward / rewardSoft`: buyer/seller jetonları, kredi ve kampanya yüzeyleri.
- `trust / trustSoft`: mağaza güveni, doğrulama ve güvenli profil alanları.
- `favorite / favoriteSoft`: favori, romantik/date ve wishlist sinyalleri.
- `info / infoSoft`: sipariş, teslimat, ödeme ve yardımcı bilgi alanları.

Eski `purple` ve `softPurple` tokenları geriye uyumluluk için korunur ama yeni UI geliştirmelerinde kullanılmaz.

## Firebase Servisleri

Kullanılan Firebase servisleri:

- **Authentication:** Email/password buyer ve seller login/signup.
- **Firestore:** ürün, mağaza, sipariş, kredi, kampanya, yorum, fit feedback, search event ve try-on job kayıtları.
- **Storage:** ürün görselleri, mağaza logo/cover görselleri, try-on input/output görselleri.
- **Cloud Functions:** AI, search, publish, checkout, credit, review, fit feedback ve try-on endpointleri.

## Ana Firestore Koleksiyonları

- `users/{uid}`: kullanıcı profili, rol, ayarlar, local sync state.
- `products/{productId}`: katalog ürünleri, seller metadata, status, stok, AI metadata.
- `sellerStores/{sellerId}`: public mağaza bilgisi, logo, cover, kargo/iade bilgisi.
- `orders/{buyerId}/items/{orderId}`: buyer order snapshot.
- `sellerOrders/{sellerId}/items/{sellerOrderId}`: satıcı fulfillment kopyası.
- `returnRequests/{buyerId}/items/{requestId}`: iade talebi kayıtları.
- `buyerCredits/{uid}`: buyer jeton bakiyesi ve ledger.
- `sellerCredits/{sellerId}`: seller AI jeton/kredi bakiyesi ve ledger.
- `sellerRewardCampaigns/{sellerId}/items/{campaignId}`: mağaza sponsorlu buyer jeton kampanyaları.
- `searchEvents/{eventId}`: search/chat funnel eventleri.
- `tryOnJobs/{uid}/items/{jobId}`: async Kabin job kayıtları.

## Ürün Source of Truth

Production davranışında ürün oluşturma client Firestore create ile yapılmaz. Seller ürün publish işlemi `publishProduct` Cloud Function üzerinden yapılır. Bu Function seller rolünü doğrular, payload validation yapar ve `products/{productId}` dokümanını backend tarafında oluşturur.

Ürün update/archive/activate akışları seller owner kontrolüyle Firestore üzerinden yürür. Archived ürünler Keşfet, Chat, Catalog ve Store public sonuçlarına girmez.

## Checkout Source of Truth

Checkout commit işlemi Firebase mode'da backend kaynaklıdır. Başarılı commit şunları birlikte üretir:

- Buyer order snapshot.
- Seller order kopyaları.
- Stok düşümü.
- Buyer purchase reward ledger hareketi.

Write başarısız olursa sepet temizlenmez ve success ekranına gidilmez.

## Storage Yapısı

Önemli path'ler:

- `sellerUploads/{sellerId}/...`: ürün, mağaza logo/cover ve enhanced product image görselleri.
- `tryOnInputs/{uid}/{jobId}/model.jpg`: kullanıcı try-on input fotoğrafı.
- `tryOnPreviews/{uid}/{jobId}/preview.*`: Gemini try-on sonucu.

Storage rules owner-only write, public/read kontrollü erişim, `image/*` content type ve dosya boyutu limitleriyle sertleştirilmiştir.

## Environment

Mobil env örnekleri `mobile/.env.example` içindedir. Functions env örnekleri `functions/.env.example` içindedir.

Önemli production prensibi:

- Gemini API key mobil uygulamaya yazılmaz.
- `GEMINI_API_KEY` Firebase Functions secret olarak tutulur.
- Endpointler Firebase ID token ile çağrılır.
- `REQUIRE_FIREBASE_AUTH=true` production için beklenen ayardır.

## Test Komutları

Mobil:

```bash
cd mobile
npm run typecheck
npm run test:ai
npm run test:try-on
npm run firebase:check
```

Functions:

```bash
cd functions
npm run build
npm run test:product-intelligence
npm run test:chat-recommend
npm run test:catalog-search
npm run test:try-on
```

Rules emulator testleri:

```bash
cd firebase
npm test
```

Not: Firebase emulator rules testleri için Java Runtime gerekir.
