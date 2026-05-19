# Aktif Özellikler

## Alıcı Özellikleri

### Keşfet

- Kişiselleştirilmiş ürün rail'leri.
- Prompt chip'leriyle Chat'e geçiş.
- Kategori ve katalog listing akışı.
- Favori, ürün detay ve sepete ekleme aksiyonları.

### Chat

- `C2S Asistan` alışveriş workspace'i.
- Doğal dil ile ürün önerisi.
- Chat içi ürün kartları: incele, Kabin, sepete ekle.
- Follow-up: daha uygun fiyatlı, aynı mağaza, benzer ürünler, kombinle.
- Chat geçmişi: sağ üstten yeni chat ve son 15 gün sohbet listesi.

### Kabin

- Kullanıcı fotoğrafı yükleme/çekme.
- Sepet ve favorilerden ürün seçme.
- Ortam seçimi.
- Buyer jeton bakiyesi ve 2 jeton maliyet gösterimi.
- Sponsorlu kampanya varsa mağaza tarafından karşılanan deneme.
- Async Gemini try-on job.
- Son denemeler modalı.
- Deneme detayında indirme, paylaşma, sepete ekleme ve Chat'ten kombin isteme.

### Sepet ve Checkout

- Sepet tabı cart-only yapıdadır.
- Çok adımlı checkout:
  - Sepet
  - Teslimat
  - Ödeme
  - Onay
  - Başarılı
- Adres, ödeme yöntemi, teslimat seçimi ve order snapshot.
- Firebase mode'da backend commit ve stok düşümü.

### Profil

- Hesap merkezi.
- Siparişlerim.
- Favorilerim.
- Adreslerim.
- Ödeme.
- Bildirim tercihleri.
- Yardım merkezi.
- Gizlilik ve güvenlik.
- Çıkış yap.

### Sipariş Sonrası

- Buyer order detail.
- Seller fulfillment status görünürlüğü.
- Satın alınmış ürünlere yorum/rating.
- Satın alınmış ürünlere fit feedback.
- Uygun kampanya varsa buyer jeton ödülü.

## Satıcı Özellikleri

### Panel

- Ciro, bekleyen sipariş, aktif ürün, ortalama AI visibility.
- Öncelikler ve hızlı aksiyonlar.
- Search/ürün/event tabanlı operasyonel özetler.

### Ürünler

- Seller ürün listesi.
- Active/archive/düşük stok/düşük AI skor filtreleri.
- Ürün edit/archive/activate.
- AI visibility göstergesi.

### AI ile Ürün Ekleme

- Ürün görseli, fiyat, stok ve bedenle hızlı başlangıç.
- Opsiyonel ürün adı/kategori ipucu.
- AI metadata üretimi.
- Manuel devam fallback.
- Profesyonel ürün fotoğrafı oluşturma.
- Backend `publishProduct` ile active publish.

### Mağaza

- Mağaza adı, açıklama ve iletişim bilgisi.
- Logo ve cover upload.
- Kargo/iade/güven bilgileri.
- Public store görünümü.
- Buyer jeton kampanyaları yönetimi.

### Siparişler

- Seller order queue.
- Status filtreleri.
- Order detail.
- Fulfillment status update.
- Return request yönetimi.

### Jeton ve Kredi

- Seller AI işlemleri için jeton bakiyesi.
- İlk girişte 20 free jeton.
- Kredi paketleri:
  - 100 jeton / 200 TL kredi.
  - 200 jeton / 400 TL kredi.
  - 500 jeton / 800 TL kredi.
- Kredi borcu satış bakiyesinden düşülecek modelle takip edilir.

### Buyer Jeton Kampanyaları

Mağazalar buyer'a şu yollarla jeton sağlayabilir:

- Alışveriş ödülü.
- Yorum ödülü.
- Fit feedback ödülü.
- Store promo.
- Sponsorlu Kabin.

Alışveriş ödülü platform tarafında her 100 TL harcama için 10 jeton olarak kurgulanmıştır.

## Demo Katalog

Hackathon videosu için canlı Firebase üzerinde 6 hayali mağaza ve 60 aktif ürün seed edilebilir. Demo ürünler zengin metadata ile Chat, Catalog, Store ve Keşfet ekranlarında görünür.

