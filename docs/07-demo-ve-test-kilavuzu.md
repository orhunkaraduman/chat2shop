# Demo ve Test Kılavuzu

## Test Kullanıcıları

Varsayılan test hesapları:

- Buyer: `buyer@chat2shop.dev / 123456`
- Seller: `seller@chat2shop.dev / 123456`

Bu hesaplar demo ve smoke test akışları için kullanılır.

## Hackathon Demo Katalogu

Canlı Firebase için 6 hayali mağaza ve 60 aktif ürün seed edilebilir. Demo kayıtları `demo-hackathon-*` prefix'i taşır ve gerçek kullanıcı/satıcı verisine dokunmaz.

Demo mağazalar:

- Luna Ceremony
- Noir Office Club
- Runway Active
- Azure Holiday
- Nura Modest
- Urban Carry

Seed komutları:

```bash
cd functions
npm run seed:hackathon-demo -- --dry-run
npm run seed:hackathon-demo -- --apply --project btkproje-8f05f
npm run seed:hackathon-demo -- --reset-demo --project btkproje-8f05f
```

Görsel upload/repair:

```bash
cd functions
npm run upload:hackathon-demo-images -- --dry-run
npm run upload:hackathon-demo-images -- --apply --project btkproje-8f05f
npm run repair:product-images
```

Demo search doğrulama:

```bash
cd functions
npm run test:hackathon-demo-search
```

## Video İçin Önerilen Promptlar

- Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın.
- Ofis için smart casual ama rahat bir kombin öner.
- Beyaz sneaker ile uyumlu hafta sonu kombini istiyorum.
- Romantik bir date için zarif ama abartısız elbise bul.
- Koşu için rahat ve şık parçalar öner.
- Düğün daveti için açık renk, zarif bir kombin istiyorum.
- Yaz tatili için hafif ve ferah parçalar bul.
- Kapalı, sade ve modern bir ofis kombini istiyorum.

## Otomatik Testler

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

Firebase rules:

```bash
cd firebase
npm test
```

Not: Rules emulator testleri için Java Runtime gerekir.

## Canlı Smoke Kontrolleri

Önce non-mutating kontroller:

- `/api/health` sağlıklı mı?
- Auth gerektiren endpointler token yokken `401` dönüyor mu?
- Buyer token ile buyer endpointleri çalışıyor mu?
- Seller token ile seller endpointleri çalışıyor mu?
- Buyer seller-only endpointlerde reddediliyor mu?
- Seller buyer-only endpointlerde reddediliyor mu?

Mutasyon testleri yalnızca test kullanıcılarıyla yapılmalıdır.

## Buyer Manuel E2E

1. Login.
2. Keşfet > ürün detay.
3. Favoriye ekle/çıkar.
4. Sepete ekle.
5. Çok adımlı checkout tamamla.
6. Sipariş detayını aç.
7. Satın alınan üründe yorum/rating gönder.
8. Satın alınan üründe fit feedback gönder.
9. Kabin'de normal üründe 2 jeton düşüşünü kontrol et.
10. Sponsorlu Kabin varsa 0 jeton davranışını kontrol et.
11. Jeton Merkezi ledger ve görevlerini kontrol et.

## Seller Manuel E2E

1. Login.
2. Mağaza logo/cover upload.
3. AI ile ürün metadata üretimi: 1 jeton düşmeli.
4. AI ürün fotoğrafı profesyonelleştirme: 5 jeton düşmeli.
5. Ürün publish.
6. Ürün edit/archive/activate.
7. Sipariş status update.
8. Buyer jeton kampanyası oluştur.
9. Kampanya bütçe ve kullanıcı limitini kontrol et.

## Bilinen Test Notları

- Mobil `test:try-on` local mock smoke'tur; canlı Gemini try-on ayrıca manuel test edilmelidir.
- Gerçek ödeme ve kargo entegrasyonu olmadığı için checkout/kargo smoke'u stateful backend davranışını doğrular.
- Social login butonları görünür ancak gerçek provider entegrasyonu yoktur.

