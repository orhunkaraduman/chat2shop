# Kullanıcı Akışları

## Buyer Akışları

### 1. Giriş ve Ana Deneyim

1. Kullanıcı email/password ile giriş yapar.
2. Rol buyer ise `Keşfet` tabına yönlenir.
3. Keşfet ekranında ürün rail'leri, kategori akışı ve Chat promptları görünür.
4. Kullanıcı ürün detayına, Chat'e, Kabin'e veya Sepet'e geçebilir.

### 2. Chat ile Ürün Bulma

1. Kullanıcı prompt yazar veya starter prompt seçer.
2. Chat backend'e `chatRecommend` isteği gönderir.
3. Sistem intent çıkarır ve ürün önerir.
4. Kullanıcı ürün kartından:
   - İncele
   - Kabin
   - Sepete ekle
   aksiyonlarını kullanır.
5. Follow-up chip'leriyle alternatif, daha ucuz ürün, aynı mağaza veya kombin isteyebilir.

### 3. Kabin

1. Kullanıcı fotoğraf yükler veya çeker.
2. Sepet/favorilerden ürün seçer.
3. Ortam seçer.
4. `Üstümde dene` ile try-on job başlatır.
5. Normal üründe 2 buyer jetonu düşer.
6. Sponsorlu kampanya varsa maliyeti mağaza karşılar.
7. Sonuç hazır olunca Son Denemeler üzerinden görüntülenir.
8. Kullanıcı sonucu indirebilir, paylaşabilir, sepete ekleyebilir veya Chat'ten kombin isteyebilir.

### 4. Satın Alma

1. Ürün sepete eklenir.
2. Sepet tabından `Satın almaya geç`.
3. Teslimat ekranında adres ve teslimat seçilir.
4. Ödeme ekranında ödeme yöntemi seçilir.
5. Onay ekranında sipariş özeti kontrol edilir.
6. Backend checkout commit başarılıysa success ekranı açılır.
7. Buyer order ve seller order kayıtları oluşur.
8. Stok düşer ve buyer jeton ödülü verilir.

### 5. Sipariş Sonrası

1. Profil > Siparişlerim.
2. Sipariş detayında ürün, adres, ödeme, toplam ve fulfillment status görünür.
3. Satın alınmış üründe yorum/rating gönderilebilir.
4. Satın alınmış üründe fit feedback verilebilir.
5. Uygun mağaza kampanyası varsa buyer jeton ödülü kazanılır.

### 6. Buyer Jeton Merkezi

1. Kabin sağ üst jeton pill'ine basılır.
2. Jeton Merkezi açılır.
3. Kullanıcı bakiye, hediye jetonlar, görevler, kampanyalar ve son hareketleri görür.
4. Aktif store promo kampanyası claim edilebilir.

## Seller Akışları

### 1. Giriş ve Panel

1. Kullanıcı seller rolüyle giriş yapar.
2. Seller tabları görünür: Panel, Ürünler, Siparişler, Mağaza.
3. Panel metrikleri ve hızlı aksiyonlar operasyonel durum verir.

### 2. AI ile Ürün Ekleme

1. Satıcı ürün görseli yükler.
2. Fiyat, stok ve bedenleri girer.
3. İsterse ürün adı/kategori ipucu ekler.
4. AI ile listeleme hazırlar.
5. Başarılı AI metadata üretiminde 1 seller jetonu düşer.
6. AI başarısız olursa manuel düzenleme modu açılır.
7. Satıcı isterse 5 jetonla ürün fotoğrafını profesyonelleştirir.
8. Listing alanlarını kontrol eder.
9. `Ürünü yayına al` ile backend publish yapar.

### 3. Ürün Yönetimi

1. Ürünler tabında seller ürünleri listelenir.
2. Filtreler: tümü, aktif, düşük stok, AI skoru düşük, arşiv.
3. Seller ürün düzenler, arşivler veya yeniden yayına alır.
4. Archived ürünler public katalogdan çıkar.

### 4. Sipariş Yönetimi

1. Siparişler tabında seller order queue görünür.
2. Seller order detail açar.
3. Durumu günceller: yeni, hazırlanıyor, kargoda, tamamlandı, sorunlu.
4. Buyer order detail bu status değişimini gösterir.
5. İade talepleri seller tarafından yönetilir.

### 5. Mağaza Yönetimi

1. Mağaza tabında mağaza adı, açıklama, iletişim, destek, kargo/iade bilgileri düzenlenir.
2. Logo ve cover görseli yüklenir.
3. Public store ve ürün detay store kartı bu bilgileri kullanır.

### 6. Jeton Kampanyaları

1. Seller kampanya tipi seçer.
2. Ödül jetonu, toplam bütçe, kullanıcı limiti ve tarih aralığı belirler.
3. Kampanya aktif olduğunda buyer Jeton Merkezi ve ilgili ürün akışlarında görünür.
4. Bütçe harcaması ledger ile izlenir.

## Hackathon Video Akışı

Önerilen kısa demo akışı:

1. Keşfet ekranında dolu katalog göster.
2. Chat'e "Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın." yaz.
3. AI önerilerinden doğru ürünün geldiğini göster.
4. Ürün detayına gir, mağaza güven kartını göster.
5. Kabin'de ürünü dene.
6. Sepete ekle ve checkout adımlarını göster.
7. Seller hesabına geç, AI ile ürün ekleme ve kampanya yönetimini göster.

