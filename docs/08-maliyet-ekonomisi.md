# Chat2Shop Maliyet Ekonomisi

## Amac

Chat2Shop'ta AI kullanimi dogrudan maliyet uretir. Bu nedenle urunde tek tip bir "tum AI bedava" yaklasimi yoktur. Her AI yuzeyi icin farkli bir ekonomi modeli tasarlanmistir.

Bu dokumanin amaci sudur:

- hangi AI akislarinin maliyet urettigini tanimlamak
- bu maliyetin kim tarafindan karsilandigini netlestirmek
- abuse riskini sinirlamak
- urun deneyimini bozmadan surdurulebilir bir model kurmak

## Temel Prensipler

Chat2Shop maliyet ekonomisi dort ilkeye dayanir:

1. Chat herkes icin serbest giris noktasi olmalidir.
2. Seller tarafindaki AI, operasyonel bir verimlilik aracidir; bu nedenle kredi ile olculur.
3. Buyer tarafindaki Kabin deneyimi, satin alma yerine kazanima dayali bir jeton sistemiyle calisir.
4. Magazalar buyer davranisini tesvik etmek icin jeton sponsorlayabilir.

## AI Yuzeyleri

Projede maliyet ureten ana AI yuzeyleri sunlardir:

- Chat recommendation
- Seller product intelligence
- Seller product photo enhancement
- Buyer try-on / Kabin

Bu yuzeyler ayni maliyet modelini kullanmaz.

## 1. Chat Ekonomisi

### Neden ucretsiz

Chat2Shop'un ana giris noktasi chat'tir. Kullanici urunu once chat ile kesfeder. Bu nedenle chat'i paywall arkasina koymak urunun cekirdek degerini zayiflatir.

### Uygulanan model

- Chat kullanim ucreti kullanicidan alinmaz.
- Platform bu maliyeti karsilar.
- Gunluk kullanim kotasi abuse korumasi icin sinirlanir.

### Mevcut kural

- `CHAT_DAILY_FREE_LIMIT = 250`

Yani bir kullanici bir gunde 250 chat AI istegine kadar ucretsiz kullanabilir. Bu limit normal kullanim icin yuksek, kotuye kullanim icin ise sinirlayicidir.

### Is mantigi

- Chat paywall degildir.
- Chat acquisition ve retention motorudur.
- Limit, maliyeti tahmin edilebilir hale getirir.

## 2. Seller AI Ekonomisi

Seller tarafinda AI, dogrudan operasyonel fayda uretir:

- urun aciklamasi yazdirir
- metadata cikartir
- arama niyetlerini guclendirir
- urun gorselini profesyonellestirir

Bu nedenle seller AI kullanimi kredi tabanli calisir.

### Baslangic bakiyesi

- Yeni seller kullaniciya `20 jeton` verilir.

### AI maliyetleri

- AI metadata uretimi: `1 jeton`
- Urun fotografi profesyonellestirme: `5 jeton`

### Kredi paketleri

Seller jetonlari dogrudan pesin odeme ile degil, kredi limiti mantigiyla verilir:

- `100 jeton = 200 TL kredi`
- `200 jeton = 400 TL kredi`
- `500 jeton = 800 TL kredi`

### Kredi limiti

- Toplam seller kredi limiti: `1000 TL`

Bu su anlama gelir:

- Seller AI araclarini hemen kullanabilir.
- Sistem aninda tahsilat yapmak zorunda kalmaz.
- Kredi borcu ileride seller gelirinden mahsup edilmeye uygundur.

### Neden bu model secildi

Seller tarafinda AI, keyfi bir tuketim degil, urun yayina alma verimliligi saglayan bir arac oldugu icin kredi limiti ile on-finance etmek mantiklidir.

## 3. Buyer AI Ekonomisi

Buyer tarafinda temel AI maliyeti Kabin deneyimidir.

### Baslangic bakiyesi

- Yeni buyer kullaniciya `10 jeton` verilir.

### Kabin maliyeti

- 1 try-on denemesi: `2 jeton`

### Neden satin alma yok

Buyer kullaniciya jeton satmak yerine kazanma mantigi secildi. Bunun nedeni:

- Kabin conversion yardimcisidir, ana satis kalemi degildir.
- Buyer friksiyonu dusuk tutulmak istenir.
- Jeton ekonomisi alisveris ve etkilesimi tesvik eden bir growth mekanigine donusturulur.

## 4. Buyer Jeton Kazanma Yollari

Buyer jetonlari satin alinmaz; kazanilir.

### Platform odulleri

- Hos geldin hediyesi: `10 jeton`
- Alisveris odulu: her `100 TL` uygun harcamaya karsi `10 jeton`


### Magaza odulleri

Magazalar buyer davranisini tesvik etmek icin ek jeton sponsorlayabilir:

- Yorum odulu: varsayilan `+3 jeton`
- Fit feedback odulu: varsayilan `+2 jeton`
- Store promo odulu: varsayilan `+5 jeton`
- Sponsorlu Kabin: buyer yerine magaza `2 jeton` maliyetini ustlenir

## 5. Magaza Sponsorlu Kampanya Modeli

Seller ve buyer ekonomisi birbirine burada baglanir.

Magaza kampanya acabilir:

- `purchase_reward`
- `review_reward`
- `fit_feedback_reward`
- `store_promo`
- `sponsored_try_on`

Her kampanyada su alanlar vardir:

- `rewardCredits`
- `budgetCredits`
- `spentCredits`
- `perUserLimit`
- `startsAt`
- `endsAt`
- `minOrderAmount`
- `productIds`
- `categoryFilter`
- `status`

Bu model sayesinde magaza buyer davranisina dogrudan tesvik verebilir ama kontrolu kaybetmez.

## 6. Kim Neyi Oduyor

Maliyet dagilimi nettir:

- Chat maliyeti: platform
- Seller metadata AI: seller jetonu
- Seller foto profesyonellestirme: seller jetonu
- Buyer normal Kabin denemesi: buyer jetonu
- Sponsorlu Kabin denemesi: magaza kampanya butcesi
- Buyer yorum / fit / promo odulleri: magaza kampanya butcesi veya platform odul kurali

Bu sayede tum AI maliyeti tek tarafa yuklenmez.

## 7. Abuse ve Risk Kontrolleri

Ekonomi modeli su kurallarla korunur:

- Gunluk chat limiti vardir.
- Reward mutation client'tan yazilmaz; backend uzerinden verilir.
- Purchase reward idempotent calisir.
- Review odulu sadece satin alinmis urunde verilir.
- Fit feedback odulu sadece satin alinmis urunde verilir.
- Ayni urun/order icin tekrar tekrar odul alinmaz.
- Kampanyalarda `perUserLimit` vardir.
- Kampanyalarda toplam butce vardir.
- Sponsorlu Kabin butce biterse buyer normal `2 jeton` harcar.
- Seller kredi limiti `1000 TL` ile sinirlanir.

## 8. Neden Bu Ekonomi Calisir

Bu model urun ve is mantigini ayni anda korur:

- Chat giris bariyerini dusurur.
- Seller AI kullanimini olculebilir hale getirir.
- Buyer Kabin kullanimini kontrollu ama erisilebilir tutar.
- Magazalara growth araci verir.
- AI maliyetini platform, seller ve magaza arasinda paylastirir.

Kisa haliyle:

- Chat acquisition motorudur.
- Seller AI operasyon motorudur.
- Kabin conversion motorudur.
- Jeton ve kampanya sistemi ise bunlari ekonomik olarak surdurulebilir hale getirir.

## 9. Mevcut Uygulama Degerleri

Bugun koddaki varsayilan ekonomik degerler sunlardir:

- Gunluk chat limiti: `250`
- Seller hos geldin jetonu: `20`
- Seller metadata AI: `1 jeton`
- Seller foto profesyonellestirme: `5 jeton`
- Seller kredi limiti: `1000 TL`
- Buyer hos geldin jetonu: `10`
- Buyer try-on: `2 jeton`
- Buyer alisveris odulu: her `100 TL` icin `10 jeton`
- Buyer yorum odulu: `3 jeton`
- Buyer fit feedback odulu: `2 jeton`
- Buyer store promo odulu: `5 jeton`

Bu degerler environment variable seviyesinde degistirilebilir.
