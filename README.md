# Chat2Shop Documentation

Chat2Shop, klasik moda e-ticaret deneyimini yapay zeka destekli sohbet tabanlı alışveriş deneyimine dönüştüren AI-first fashion marketplace uygulamasıdır.

Kullanıcı kıyafet aramaz; tarzını, ihtiyacını ve bağlamını anlatır. AI ürünleri anlar, en uygun parçaları bulur, kombinler, kullanıcının üzerinde önizler ve satın alma sürecini yönetir.

## Kısa Tanım

**TR:** Kullanıcı kıyafet aramaz; tarzını anlatır. AI ürünleri anlar, en uygun parçaları bulur, kombinler, üzerinde gösterir ve satın alma sürecini yönetir.

**EN:** An AI-first fashion marketplace where sellers upload products with AI-generated metadata, and users discover, try on, and buy fashion items through conversation.

## Temel Sunum Cümleleri

- We are replacing filters with conversation, and manual product listings with AI-generated product intelligence.
- Our AI does not only talk to users. It also understands products.
- Chat2Shop turns fashion shopping into a personal styling conversation.

## Doküman Haritası

- [Proje Özeti](docs/01-proje-ozeti.md)
- [Teknik Mimari](docs/02-teknik-mimari.md)
- [AI ve Backend](docs/03-ai-ve-backend.md)
- [Aktif Özellikler](docs/04-aktif-ozellikler.md)
- [Kullanıcı Akışları](docs/05-kullanici-akislari.md)
- [MVP Kapsamı Dışında Kalan Özellikler](docs/06-mvp-kapsami-disinda.md)
- [Agentic Yapi](docs/07-agentic-yapi.md)
- [Maliyet Ekonomisi](docs/08-maliyet-ekonomisi.md)

## Geliştirme

Mobil uygulama Expo + React Native + TypeScript ile `mobile/` klasörü altında geliştiriliyor.

```bash
cd mobile
npm install
npm run web
npm run typecheck
npm run test:ai
npm run test:try-on
```

Firebase Functions endpoint'i `functions/` klasörü altında ayrı TypeScript projesi olarak bulunur.

```bash
cd functions
npm install
npm run build
npm run test:product-intelligence
```
