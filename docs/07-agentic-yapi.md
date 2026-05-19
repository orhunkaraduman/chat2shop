# Chat2Shop Agentic Yapi

## Amac

Chat2Shop'ta AI tek bir sohbet cevabi ureten katman degildir. Sistem, urun verisini hazirlayan, kullanici niyetini yorumlayan, katalogu tarayan, sonuclari siralayan ve Kabin onizlemesini yoneten birden fazla karar adimindan olusur.

Bu yapinin ana hedefi sudur:

- Satici tarafinda urun girisini kolaylastirmak.
- Urun metadata kalitesini standartlastirmak.
- Chat tarafinda daha isabetli urun bulmak.
- Kabin tarafinda daha guvenilir ve baglama uygun try-on sonucu uretmek.

## Neden Agentic

Klasik e-ticaret verisi, sohbet tabanli arama icin yeterli olmaz. Sadece `title`, `price` ve bir gorsel ile "mezuniyet icin kapali, sade ama sik bir elbise" gibi bir istegi dogru karsilamak zordur.

Bu nedenle Chat2Shop urunu once anlamlandirir, sonra bu anlamlandirilmis veriyi chat ve arama katmaninda kullanir.

Kisa haliyle akis soyledir:

1. Satici urun gorselini ve minimum alanlari girer.
2. AI urune yapisal metadata uretir.
3. Bu metadata katalogdaki source of truth olur.
4. Chat kullanicinin niyetini parse eder.
5. Retrieval ve ranking bu metadata ustunden calisir.
6. Kabin ise ayni urun bilgisini gorsel onizleme kararlarinda kullanir.

## Satici Tarafi AI Urun Yukleme

### Minimum veri ile baslangic

Satici urun eklerken uzun bir form doldurmak zorunda kalmaz. Ana giris sinyalleri:

- urun gorseli
- fiyat
- stok
- bedenler
- opsiyonel urun adi veya kategori ipucu

Bu girisler, AI icin bir draft baglami olusturur.

### Product Intelligence katmani

`productIntelligence` akisi, gorsel ve draft baglamindan su alanlari uretir veya guclendirir:

- urun adi
- kisa ve uzun aciklama
- kategori
- ana renk
- fit
- modesty
- sezon
- style tags
- vibe tags
- occasion tags
- ai search intents
- visibility score
- reasoning

Bu katman seller'in manuel veri yukunu azaltir, ama son karar seller'da kalir. Yani sistem human-in-the-loop calisir:

- AI basariliysa seller duzenleyip yayinlar.
- AI timeout veya hata verirse seller manuel modda devam eder.

### Profesyonel urun fotografi

AI yalnizca metadata uretmez. Satici isterse urun gorselini tek bir ek aksiyonla e-commerce'a daha uygun hale getirebilir.

Mode bazli fotograf iyilestirme su amacla calisir:

- beyaz katalog fonu
- premium studyo hissi
- minimal editoriyel sunum
- lifestyle commerce sunumu

Bu adim urunu degistirmek icin degil, daha temiz kadraj, fon ve isikla sunmak icindir.

## Metadata Neden Chat'i Guclendiriyor

Chat kalitesinin ana farki prompt degil, urun verisinin kalitesidir.

Chat2Shop'ta chatbot sadece kullanicinin cumlesine cevap vermez. Once niyeti parse eder, sonra katalogu metadata sinyalleriyle tarar.

Kullanilan temel sinyaller:

- category
- color
- size
- fit
- modesty
- style tags
- vibe tags
- occasion tags
- ai search intents
- visibility score
- seller reliability

Ornek:

`Mezuniyet icin siyah, sade ama sik, cok acik olmayan bir elbise ariyorum.`

Bu istekte sistem yalnizca "elbise" kelimesini aramaz. Sunlari birlikte degerlendirir:

- `occasion = graduation`
- `color = black`
- `style = minimal / elegant`
- `modesty = medium-high or high`
- `category = dress`

Bu sayede chat her istekte ayni urunleri donmek yerine, urun metadata'si ile istek niyetini eslestirir.

## Chat Tarafindaki Agentic Akis

Chat akisinda temel karar adimlari vardir:

### 1. Intent parse

Sistem kullanicinin mesajindan su tip sinyalleri cikarir:

- kategori
- renk
- kullanim amaci
- stil
- butce
- beden
- modesty / kapalilik beklentisi
- follow-up modu

### 2. Candidate retrieval

Katalogtan aktif urunler cekilir. Retrieval katmani once genis bir aday havuzu cikarir.

### 3. Deterministic ranking

Sonuclari asagidaki sinyaller agirliklandirir:

- intent uyumu
- kategori uyumu
- renk uyumu
- beden uygunlugu
- fiyat uyumu
- style / vibe / occasion uyumu
- modesty uyumu
- ai visibility
- seller reliability

### 4. Explanation generation

AI veya fallback explanation katmani, kullaniciya neden bu urunlerin one ciktigini kisa ve anlasilir sekilde aciklar.

### 5. Commerce actions

Chat yalnizca tavsiye vermez. Urun kartlari icinden su aksiyonlara akar:

- urun detay
- Kabin
- sepete ekle
- kombin iste
- ayni magazadan oner
- daha uygun fiyatli alternatif

## Kabin Tarafindaki Agentic Mantik

Kabin mantigi da basit bir image overlay degildir. Try-on sonucu daha isabetli olsun diye urun ve baglam uzerinden ek kararlar alinir.

### Girdi sinyalleri

Kabin su verilerle calisir:

- kullanici fotografi
- secilen urun
- ortam secimi
- urun kategorisi
- urunun renk ve stil bilgisi

### Otomatik kadraj karari

Her urun ayni kadraj ihtiyacina sahip degildir. Bu nedenle sistem `frameMode` benzeri bir mantik kullanir:

- `full_body`: elbise, pantolon, uzun dis giyim
- `upper_body`: tisort, gomlek, blazer, ceket
- `lower_body`: ayakkabi ve alt beden odakli urunler
- `accessory_focus`: canta ve aksesuar

Boylece sistem ornegin bir elbiseyi ust bedene crop etmez, ya da bir ayakkabida ayak alanini ikinci plana atmaz.

### Urun orijinalligini koruma

Kabin promptlari yalnizca "guzel bir gorsel" uretmeye degil, urunun kendisini korumaya yoneliktir:

- renk korunur
- desen korunur
- yaka ve kol formu korunur
- boy korunur
- urune yeni detay eklenmez
- duz urune desen eklenmez
- desenli urun sadeleştirilmez

Bu, try-on kalitesinin en kritik kosuludur. Aksi halde kullanici farkli bir urun gormus olur.

### Ortam baglami

Kullanici ortami secebilir:

- disarida
- evde
- partide
- ofiste

Bu secim urunu degistirmez; yalnizca sahne ve sunum baglamini yonlendirir.

## Agentic Yapinin Is Sonucu

Bu mimari urunu dort farkli yerde guclendirir:

- Satici daha hizli ve daha duzgun urun listeler.
- Katalog daha anlamli metadata ile dolar.
- Chat daha dogru urunleri one cikarir.
- Kabin daha baglama uygun ve urune sadik gorsel onizleme uretir.

Chat2Shop'un temel farki burada ortaya cikar:

AI sadece kullaniciyla konusmaz. Urunu, niyeti ve gorsel baglami ayni sistem icinde birlikte yorumlar.
