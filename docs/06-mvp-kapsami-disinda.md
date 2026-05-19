# MVP Kapsamı Dışında Kalan Özellikler

Bu doküman, bugünkü uygulamada bilinçli olarak production kapsamı dışında bırakılan veya sonraki sprintlere ayrılan işleri listeler.

## P0 Açıklar

### Gerçek Ödeme

Checkout Firestore/backend state oluşturur; ancak gerçek ödeme tahsilatı yoktur.

Eksik alanlar:

- Stripe, Iyzico veya PayTR entegrasyonu.
- Payment intent / 3D Secure.
- Webhook doğrulama.
- Ödeme başarısızlığı.
- Refund ve chargeback.

### Gerçek Kargo

Seller fulfillment status vardır; ancak gerçek kargo sağlayıcısı yoktur.

Eksik alanlar:

- Kargo etiketi oluşturma.
- Takip numarası doğrulama.
- Shipment provider API.
- Teslimat status webhookları.

### Stok ve Commerce Hardening

Checkout backend commit ve stok düşümü vardır. Production ölçeği için daha ileri garanti gerekir:

- Yüksek concurrency testleri.
- Stok rezervasyon penceresi.
- Payment başarısızlığında stok geri alma.
- İade/refund sonrası stok hareketleri.

### Production Güvenlik

Eksik alanlar:

- Firebase App Check.
- Kalıcı store destekli rate limit.
- Content moderation.
- Abuse monitoring.
- Try-on consent ve veri silme ekranları.

## P1 Açıklar

### Sosyal Auth

Apple, Google ve Facebook butonları arayüzde görünür; gerçek provider entegrasyonu yoktur.

Eksik alanlar:

- Apple Sign In.
- Google Sign In.
- Facebook Login.
- Account linking.

### Forgot Password ve Email Verification

Email/password login çalışır. Eksik auth akışları:

- Şifremi unuttum.
- Email verification.
- Hesap silme.
- Veri indirme.

### Seller Payout

Seller kredi borcu ve kampanya bütçeleri takip edilir; ancak gerçek ödeme/payout sistemi yoktur.

Eksik alanlar:

- Seller wallet.
- Payout schedule.
- Komisyon kesintisi.
- Fatura/rapor.

### Moderasyon

Ürün publish edildiğinde direkt active olur. Eksik alanlar:

- Ürün onay kuyruğu.
- Görsel ve açıklama moderasyonu.
- Şikayet akışı.
- Seller kalite skoru.

### AI Kalite Değerlendirme

AI endpointleri çalışır; ancak sistematik eval set yoktur.

Eksik alanlar:

- Chat recommendation benchmark.
- Catalog search relevance seti.
- Product intelligence regression dataset.
- Try-on kalite/güvenlik test seti.

## P2 Açıklar

### UI/UX QA

Birçok ekran redesign edildi; ancak sistematik görsel QA yoktur.

Eksik alanlar:

- 375x667, 390x844, Android ve web viewport smoke.
- Screenshot regression.
- Loading/error/empty state audit.
- Accessibility pass.

### CI/CD

Eksik alanlar:

- GitHub Actions.
- Otomatik typecheck/test/build.
- Firebase rules test pipeline.
- EAS build.
- Staging/prod environment ayrımı.
- Release checklist.

### Analytics Dashboard

Event ve search records vardır; aggregate dashboard eksiktir.

Eksik alanlar:

- Search to detail funnel.
- Detail to cart funnel.
- Checkout conversion.
- Return rate.
- Seller campaign ROI.

## Önerilen Sıradaki Sprintler

1. **Production Cleanup + Security:** demo/mock yüzeylerini production moddan temizle, App Check ve rate limit ekle.
2. **Payment v1:** gerçek ödeme sağlayıcısı, webhook ve ödeme başarısızlığı.
3. **Shipment v1:** kargo provider modeli, tracking ve shipment detail.
4. **AI Eval v1:** chat/search/product intelligence kalite test setleri.
5. **CI/CD v1:** typecheck, functions build, rules test, deploy dry-run pipeline.

