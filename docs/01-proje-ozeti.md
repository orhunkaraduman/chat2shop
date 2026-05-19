# Chat2Shop Proje Özeti

## Kısa Tanım

Chat2Shop, moda alışverişini klasik kategori ve filtre deneyiminden çıkarıp AI destekli sohbet, kişiselleştirilmiş ürün keşfi ve sanal kabin akışıyla yeniden kurgulayan bir marketplace uygulamasıdır.

Alıcı ne istediğini doğal dille anlatır. Sistem kullanıcının bağlamını, bütçesini, stilini, beden sinyalini ve ürün metadata'sını birlikte değerlendirerek ürün, kombin ve alternatif önerileri üretir. Satıcı tarafında ise ürün yükleme, ürün metni, etiketleme, arama niyetleri ve profesyonel ürün fotoğrafı hazırlama AI ile hızlandırılır.

## Problem

Moda e-ticaretinde kullanıcılar çoğu zaman kategori adıyla değil, bağlamla alışverişe başlar:

- Mezuniyet için çok açık olmayan siyah elbise.
- Ofise uygun smart casual kombin.
- Beyaz sneaker ile hafta sonu kombini.
- Romantik date için zarif ama abartısız elbise.

Klasik arama ve filtre sistemi bu niyeti anlamakta zorlanır. Satıcı tarafında da ürün başlığı, açıklama, renk, kategori, stil etiketi ve arama niyeti eksik olduğunda doğru ürün doğru kullanıcıya ulaşamaz.

## Çözüm

Chat2Shop iki tarafı aynı ürün zekasıyla bağlar:

- **Alıcı:** Chat, Keşfet, Kabin, Sepet ve Profil üzerinden ürünleri keşfeder, sorar, dener ve satın alır.
- **Satıcı:** AI ile ürün ekler, ürün görselini profesyonelleştirir, mağazasını yönetir, siparişleri takip eder ve buyer jeton kampanyaları açar.

Sistem sadece "chatbot eklenmiş e-ticaret" değildir. Ürünün ana farkı, kullanıcı niyetini ve ürün metadata'sını aynı arama ve öneri katmanında birleştirmesidir.

## Temel Değer Önerileri

### Alıcı İçin

- Doğal dille ürün bulma.
- Chat içinde ürün önerisi, alternatif, kombin ve karşılaştırma.
- Kabin ile ürünleri kendi fotoğrafında deneme.
- Ürün detayında mağaza güven bilgisi, yorum, fit feedback ve satın alma sonrası değerlendirme.
- Çok adımlı klasik checkout.
- Buyer jeton sistemi: Kabin için harcanan jetonlar satın alınmaz; alışveriş, yorum, fit feedback ve mağaza kampanyalarıyla kazanılır.

### Satıcı İçin

- AI ile ürün adı, açıklama, kategori, renk, etiket, arama niyeti ve visibility score üretimi.
- 5 jeton karşılığında ürün fotoğrafını profesyonel e-ticaret görseline dönüştürme.
- Ürün, sipariş, mağaza ve kampanya yönetimi.
- Seller jeton/kredi sistemi: AI ürün listeleme ve görsel iyileştirme maliyetleri satıcı kredisiyle yönetilir.
- Buyer'a jeton kazandıran kampanyalar: yorum ödülü, fit feedback ödülü, alışveriş ödülü, mağaza promosyonu ve sponsorlu Kabin.

## Ürün Durumu

Proje mock MVP seviyesini geçmiş durumdadır. Expo mobile app, Firebase Auth, Firestore, Storage, Cloud Functions, Gemini tabanlı AI endpointleri, Internal Search Engine v2, async try-on job yapısı ve hackathon demo katalogu çalışır durumdadır.

Gerçek ödeme, gerçek kargo sağlayıcısı, sosyal auth, payout ve kapsamlı moderasyon henüz production kapsamına alınmamıştır. Bu alanlar açık backlog olarak tutulur.

## Hedef Kullanıcılar

- Moda alışverişinde kararsız kalan ve bağlama göre öneri isteyen alıcılar.
- Kategori/filtre yerine sohbetle alışveriş yapmak isteyen kullanıcılar.
- Ürünü kendi üzerinde görmek isteyen kullanıcılar.
- Küçük ve orta ölçekli moda satıcıları.
- Ürün listeleme ve metadata kalitesini AI ile artırmak isteyen mağazalar.

## Tasarım Yönü

Tasarım dili "Clean AI shopping assistant" olarak belirlenmiştir:

- Nötr zemin, temiz kart yapıları ve sınırlı brand vurgu.
- AI özellikleri görünür ama ekranı domine etmeyen mikrocopy.
- Buyer tarafında sade alışveriş deneyimi.
- Seller tarafında operasyonel, taranabilir ve karar odaklı panel dili.

Güncel renk yönü "Editorial Commerce + role-based accent" olarak sadeleştirilmiştir:

- Ana marka dili koyu ink/siyah üzerine kurulur; bu renk genel yapı, başlık ve nötr aksiyonlarda kalır.
- Mor ana marka rengi olarak kullanılmaz; eski `purple` alias'ları geriye uyumluluk için koyu ink değerine bağlanır.
- AI sinyalleri teal ile ayrışır.
- Satın alma, sepet ve checkout aksiyonları sıcak commerce tonuyla ayrışır.
- Kabin ve try-on akışları ayrı, sakin mavi-gri accent kullanır.
- Jeton/kredi/ödül sistemi sıcak amber/gold tonuyla ayrışır.
- Mağaza güveni ve teslimat/ödeme bilgileri trust/info tonlarıyla ayrışır.
- Favori ve romantik/date sinyalleri sınırlı rose accent kullanır.
- Kırmızı/coral yalnızca hata ve riskli aksiyonlarda kullanılır.
