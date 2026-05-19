# Teknik Mimari

## Amac

Bu dokuman Chat2Shop'un teknik yapisini sistem seviyesinde anlatir. Hedef, projeyi ilk kez acan bir gelistiricinin su sorulara hizli cevap bulmasidir:

- Sistem hangi katmanlardan olusuyor?
- Hangi veri nerede tutuluyor?
- Mobile hangi endpoint'i ne zaman cagiriyor?
- Firebase acikken ve kapalirken davranis nasil degisiyor?
- AI, search, checkout ve Kabin akislari teknik olarak nasil calisiyor?

Bu dokuman urunu anlatmaz; sistemin nasil kuruldugunu anlatir.

## Sistem Gorunumu

Chat2Shop dort ana katmandan olusur:

1. `mobile/`
   Expo Router tabanli React Native istemcisi.
2. `functions/`
   Firebase Cloud Functions backend katmani.
3. `firebase/`
   Firestore ve Storage rules, indexler ve rules test altyapisi.
4. `docs/`
   Proje, AI, akış ve ürün kararı dokümanları.

Kisa sistem akisi:

- Mobile uygulama UI ve istemci state'ini yonetir.
- Firebase Auth kimlik dogrulamayi saglar.
- Firestore source of truth veri tabanidir.
- Storage gorsel dosyalari tutar.
- Functions, AI ve kritik mutasyonlarin backend katmanidir.

## Katmanlar Arasi Sorumluluklar

### Mobile

Mobile katman su isleri yapar:

- navigation
- ekran state'i
- optimistic olmayan kullanici akislari
- repository secimi
- Firebase ID token ile backend cagrisi
- local fallback ve demo mode davranisi

Mobile, production'da yapmamasi gereken iki seyi yapmaz:

- AI key tasimaz
- kritik product publish mutasyonunu dogrudan client create olarak Firestore'a yazmaz

### Functions

Functions katmaninin gorevi sudur:

- auth guard
- role guard
- input validation
- Gemini cagrisi
- Firestore transaction veya kontrollu write
- kredi / jeton / reward ledger mutasyonu
- try-on async job orkestrasyonu

Functions, istemcinin dogrudan guvenilmeyecegi alanlarda karar mercisidir.

### Firestore

Firestore proje icin ana source of truth'tur.

Burada tutulan ana veri tipleri:

- kullanici profili
- urunler
- magaza profilleri
- buyer order snapshot
- seller fulfillment kopyasi
- iade talepleri
- buyer jeton hesaplari
- seller kredi hesaplari
- reward campaign'ler
- search eventleri
- try-on job kayitlari

### Storage

Storage asagidaki gorsel turlerini tutar:

- seller urun gorselleri
- seller magaza logo ve cover gorselleri
- profesyonellestirilmis urun fotografi ciktilari
- try-on input fotoğrafları
- try-on output onizlemeleri

## Repo Yapisi

### `mobile/`

Ana klasorler:

- `app/`: Expo Router route dosyalari
- `src/state/`: global istemci state ve action'lar
- `src/repositories/`: Firebase ve local repository implementasyonlari
- `src/services/`: AI, try-on, analytics, upload, fit, storage yardimcilari
- `src/components/`: paylasilan UI bilesenleri
- `src/data/`: mock/demo veri ve sabitler
- `assets/`: ikonlar, logo ve demo urun gorselleri

Ana giris noktasi:

- `mobile/app/_layout.tsx`
- `mobile/app/(tabs)/_layout.tsx`

### `functions/`

Ana klasorler:

- `src/index.ts`: function export giris noktasi
- `src/security.ts`: auth, role, validation helper'lari
- `src/admin.ts`: Firebase Admin instance
- `src/secrets.ts`: secret tanimlari
- `src/gemini.ts`: Gemini entegrasyonu ve prompt builder'lar
- `src/retrieval.ts`: internal search retrieval ve ranking
- `src/chatRecommend.ts`: chat recommendation backend akisi
- `src/productIntelligence.ts`: seller listing metadata generation
- `src/productImageEnhancement.ts`: urun foto profesyonellestirme
- `src/checkout.ts`: checkout commit ve order write mantigi
- `src/tryOn.ts`: create job, process job, signed URL, cleanup
- `src/buyerCredits.ts`: buyer jeton mantigi
- `src/sellerCredits.ts`: seller kredi ve AI jeton mantigi
- `src/productPublish.ts`: backend publish mantigi
- `test/`: smoke testler
- `scripts/`: seed, smoke ve operasyon scriptleri

### `firebase/`

Ana dosyalar:

- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `tests/rules.test.ts`

## Navigation Mimarisi

### Buyer tarafi

Buyer ana tablari:

- `Kesfet`
- `Chat`
- `Kabin`
- `Sepet`
- `Profil`

Buyer tarafinda tab disi route'lar:

- `product/[id]`
- `catalog`
- `store/[id]`
- `order/[id]`
- `orders`
- `favorites`
- `addresses`
- `payments`
- `buyer-credits`
- `checkout/*`

### Seller tarafi

Seller rolunde tab yapisi buyer'dan ayrilir:

- `Panel`
- `Urunler`
- `Siparisler`
- `Magaza`

Seller tarafinda tab disi route'lar:

- `seller-product/[id]`
- `seller-order/[id]`
- `seller-credits`

Role-based navigation mobile tarafinda tek app icinde cozulur; buyer ve seller icin ayri binary veya ayri app yoktur.

## State ve Veri Akisi

Ana istemci state merkezi:

- `mobile/src/state/AppContext.tsx`

Bu katman su sorumluluklari bir araya getirir:

- auth state
- user profile
- catalog
- favorites
- cart
- checkout
- orders
- seller products
- seller store
- buyer credits
- seller credits
- reward campaigns
- chat state
- try-on state
- analytics log

### Repository yapisi

Repository secimi:

- Firebase aktifse `firebaseRepositories`
- Firebase kapaliysa `localRepositories`

Ana amac su ayrimi saglamaktir:

- ekranlar veri kaynagindan habersiz kalsin
- production davranisi backend merkezli olsun
- demo/dev mode calismaya devam etsin

Bu yapi tam clean architecture degil, ama pratik bir adapter katmani kurar.

## Persistence Stratejisi

### Firebase aktifken

Asil veri kaynaklari:

- Firestore
- Storage
- Functions

AsyncStorage bu modda sadece su alanlarda yardimci olabilir:

- local UI tercihleri
- offline toleransli gecici state
- non-critical istemci cache

### Firebase kapaliyken

Uygulama demo/dev mode'a doner:

- local repository aktif olur
- AsyncStorage tabanli veya memory tabanli fallback kullanilir
- AI endpointleri icin local fallback sonuc uretebilir

Bu mod production source of truth olarak dusunulmez.

## Firebase Servisleri

### Authentication

Kullanilan model:

- email/password
- buyer ve seller role ayrimi

Auth sonucu `users/{uid}` dokumanindaki role ve profil ile birlesir.

### Firestore

Firestore sadece "store" degil, sistem state'inin ana omurgasidir:

- katalog
- commerce
- reward economy
- try-on jobs
- analytics

### Storage

Storage ozellikle gorsel agirlikli yuzeyler icin kullanilir:

- urun yukleme
- magaza gorselleri
- AI image enhancement
- try-on input/output

### Cloud Functions

Functions iki tur is yapar:

- HTTP endpoint
- async / scheduled job

HTTP endpoint ornekleri:

- `productIntelligence`
- `enhanceProductImage`
- `chatRecommend`
- `catalogSearch`
- `searchIntent`
- `publishProduct`
- `commitCheckout`
- `createTryOnJob`
- `getTryOnJob`
- `buyerCreditCenter`
- `submitProductReview`
- `submitFitFeedback`

Async / scheduled ornekler:

- `processTryOnJob`
- `cleanupTryOnAssets`

## Firestore Veri Modeli

### `users/{uid}`

Tutar:

- email
- role
- style profile
- checkout/profile state
- user settings

Bu dokuman kullanicinin "ana profil" kaydidir.

### `products/{productId}`

Tutar:

- sellerId
- title
- price
- stock
- imageUrl
- category
- sizes
- color
- fit
- modesty
- season
- style/vibe/occasion tags
- aiSearchIntents
- visibilityScore
- status
- createdAt / updatedAt

Bu koleksiyon public katalog source of truth'tur.

### `sellerStores/{sellerId}`

Tutar:

- magaza adi
- aciklama
- contact / support alanlari
- logoUrl
- coverUrl
- trust badge bilgileri
- kargo ve iade bilgileri

Bu koleksiyon public store deneyiminin source of truth'udur.

### `orders/{buyerId}/items/{orderId}`

Buyer order snapshot'tir. Siparis anindaki su veriler snapshot olarak yazilir:

- urunler
- fiyatlar
- adres
- odeme yontemi
- delivery secimi
- totals
- sellerOrderIds
- statusSummary

Boylece kullanici daha sonra adresini degistirse bile eski siparis bozulmaz.

### `sellerOrders/{sellerId}/items/{sellerOrderId}`

Satıcı fulfillment kaydidir. Buyer order'dan ayridir.

Tutar:

- buyerId
- buyerOrderId
- line item'lar
- fulfillment status
- tracking / carrier alanlari
- return relation alanlari

Bu kayit satıcının operasyon paneli icindir.

### `returnRequests/{buyerId}/items/{requestId}`

Iade surecinin source of truth kaydidir.

### `buyerCredits/{uid}`

Buyer jeton hesabidir.

Alt koleksiyon:

- `ledger`

Tutar:

- bakiye
- total earned
- total used
- ledger hareketleri

### `sellerCredits/{sellerId}`

Seller AI kredi hesabidir.

Alt koleksiyon:

- `ledger`

Tutar:

- free credits
- paid credits
- total granted
- total used
- credit debt amount
- credit limit amount

### `sellerRewardCampaigns/{sellerId}/items/{campaignId}`

Magazanin buyer odul kampanyalari.

Tipler:

- `purchase_reward`
- `review_reward`
- `fit_feedback_reward`
- `store_promo`
- `sponsored_try_on`

### `searchEvents/{eventId}`

Search ve chat funnel eventleri.

### `tryOnJobs/{uid}/items/{jobId}`

Async Kabin islerinin source of truth kaydidir.

Alanlar:

- status
- selected product snapshot
- input image path
- preview output path
- expiresAt
- frameMode

## Ana Is Akislari

## 1. Seller urun yayinlama

Akis:

1. Seller gorsel, fiyat, stok ve beden girer.
2. Isterse AI metadata olusturur.
3. Isterse gorseli profesyonellestirir.
4. Publish istegi `publishProduct` endpoint'ine gider.
5. Backend seller role ve payload validation yapar.
6. Product dokumani `active` status ile yazilir.
7. Product public katalogda gorunur.

Bu akis seller'in client tarafinda products create yapmasini engeller.

## 2. Chat recommendation

Akis:

1. Mobile prompt ve profile'i gonderir.
2. Backend intent parse eder.
3. Retrieval aktif urunlerden candidate set cikarir.
4. Deterministic ranking ile siralar.
5. Explanation doner.
6. Mobile urun kartlarini render eder.

Eger endpoint hata verirse mobile local fallback calisabilir.

## 3. Catalog search

Akis:

1. Query ve filtreler backend'e gider.
2. Internal Search Engine candidate bulur.
3. Kategori, renk, beden, modesty, butce, style ve seller quality sinyalleriyle siralama yapilir.
4. Sonuc ve explanation doner.

Algolia gibi harici bir search provider kullanilmaz.

## 4. Checkout commit

Akis:

1. Buyer sepet, adres, odeme ve delivery secimlerini yapar.
2. `commitCheckout` backend'e gider.
3. Backend stok ve payload kontrolu yapar.
4. Buyer order snapshot yazilir.
5. Seller order kopyalari yazilir.
6. Stok dusulur.
7. Reward ve ilgili ledger write'lari islenir.
8. Basariliysa success ekranina gecilir.

Bu write basarisiz olursa sepet temizlenmez.

## 5. Kabin try-on

Akis:

1. Buyer fotograf yukler veya ceker.
2. Urun ve ortam secer.
3. Mobile `frameMode` hesaplar veya backend'e default birakir.
4. `createTryOnJob` backend'e gider.
5. Backend inputlari yazar ve job olusturur.
6. `processTryOnJob` Gemini image generation calistirir.
7. Output Storage'a yazilir.
8. Mobile polling ile sonucu alir.

Try-on sync degil, async job modelidir.

## 6. Buyer / seller kredi ekonomisi

Ekonomi modeli iki ayri hesap sistemiyle kurulur:

- buyer credits
- seller credits

Seller AI maliyeti seller kredisiyle gider.
Buyer Kabin maliyeti buyer jetonlariyla gider.
Magaza isterse sponsorlu kampanyalarla buyer davranisini tesvik eder.

## AI ve Search Katmani

### Product intelligence

AI seller input'undan su alanlari uretir veya guclendirir:

- title
- description
- category
- color
- fit
- modesty
- season
- search intents
- style/vibe/occasion tags
- visibility score

### Search ve ranking

Ranking sinyalleri:

- kategori uyumu
- renk uyumu
- beden uygunlugu
- butce uyumu
- style / vibe / occasion uyumu
- modesty uyumu
- ai visibility
- seller reliability

### Kabin gorsel mantigi

Try-on prompt'u urunun orijinalligini korumaya odaklanir:

- renk korunur
- desen korunur
- yaka ve kol formu korunur
- uzunluk korunur
- urune yeni detay eklenmez

Kadraj urun tipine gore secilir:

- `full_body`
- `upper_body`
- `lower_body`
- `accessory_focus`

## Tasarim Sistemi

Gorsel sistem `mobile/src/theme.ts` icindeki semantik tokenlarla yonetilir.

Ana semantik gruplar:

- `ai / aiSoft`
- `commerce / commerceSoft`
- `tryOn / tryOnSoft`
- `reward / rewardSoft`
- `trust / trustSoft`
- `favorite / favoriteSoft`
- `info / infoSoft`
- `danger`

Amac "tek ana renkli uygulama" degil, islev bazli accent sistemidir.

## Security Sinirlari

### Mobile'da tutulmayan seyler

- Gemini API key
- admin write yetkisi
- reward ledger mutasyonu
- publish create authority

### Functions tarafinda zorlanan seyler

- Firebase ID token
- role check
- payload schema validation
- ownership kontrolu
- rate limit
- usage allowance

### Rules tarafinda zorlanan seyler

- product update ownership
- public / private veri ayrimi
- Storage write owner siniri
- image mime ve size limitleri

## Environment ve Secret Yonetimi

### Mobile env

`mobile/.env.example` icinde tutulur.

Burada yalnizca public client config bulunur:

- Firebase public config
- endpoint URL'leri
- timeout veya public cost config'leri

### Functions env

`functions/.env.example` icinde tutulur.

Burada runtime davranisi tanimlayan env'ler vardir:

- auth gerekliligi
- chat limiti
- jeton degerleri
- reward degerleri
- search candidate limiti
- try-on retention

### Secret

Gercek model anahtari repo'ya yazilmaz.

- `GEMINI_API_KEY` Firebase Functions secret olarak kullanilir.

## Deploy ve Runtime

Beklenen production modeli:

- Mobile Expo bundle
- Firebase Auth
- Firestore
- Storage
- Functions Gen 2

Functions deployment komutu tipik olarak:

```bash
firebase deploy --only functions --project <project-id>
```

Rules deployment:

```bash
firebase deploy --only firestore:rules,storage --project <project-id>
```

## Test Stratejisi

### Mobile

```bash
cd mobile
npm run typecheck
npm run test:ai
npm run test:try-on
npm run firebase:check
```

### Functions

```bash
cd functions
npm run build
npm run test:product-intelligence
npm run test:chat-recommend
npm run test:catalog-search
npm run test:try-on
```

### Firebase rules

```bash
cd firebase
npm test
```

Not:

- Rules emulator testleri Java Runtime ister.
- Smoke testler business logic'i korur ama tam E2E kapsami degildir.

## Bilinen Tradeoff'lar

Bugunku mimari bilincli olarak su tradeoff'lari alir:

- AppContext buyuk bir state merkezi; domain ayrimi tam moduler degil.
- Local fallback halen vardir; bu, demo dayanikliligi saglar ama mimariyi karmaşıklaştırır.
- Search harici provider yerine internal retrieval kullanir; bu daha kontrol edilebilir ama tuning ister.
- Try-on gercek AI calisir ama fiziksel beden dogrulugu garantisi vermez.
- Checkout backend source of truth'tur ama gercek odeme ve kargo entegrasyonu ayri backlog'tur.

## Ozet

Chat2Shop'un teknik mimarisi tek bir chatbot entegrasyonu degildir. Sistem:

- AI ile urun verisini zenginlestirir
- bu veriyi search ve chat katmanina baglar
- commerce state'ini Firestore merkezli yonetir
- Kabin'i async gorsel job olarak calistirir
- buyer ve seller icin ayri ekonomi modelleri kurar

Bu nedenle mimari, marketplace + recommendation engine + visual try-on + credit economy birlesimi olarak dusunulmelidir.
