import type { Category, ModestyLevel, OccasionTag, Product, StyleTag } from './types';

export type DemoStore = {
  sellerId: string;
  name: string;
  description: string;
  contact: string;
  shippingTime: string;
  returnPolicy: string;
  logoUrl: string;
  coverUrl: string;
  supportEmail: string;
  supportPhone: string;
  faq: string;
  rating: number;
  badges: string[];
  trustBadges: string[];
  createdAt: string;
  updatedAt: string;
};

const DEMO_DATE = '2026-05-19T00:00:00.000Z';

const cover = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const image = (id: string) => id.startsWith('http')
  ? id
  : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const logo = (name: string, background: string, color = '141821') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=${color}&bold=true&format=png`;

export const demoStores: DemoStore[] = [
  {
    sellerId: 'demo-hackathon-luna',
    name: 'Luna Ceremony',
    description: 'Mezuniyet, davet ve zarif gece görünümleri için sade ama güçlü parçalar sunan butik mağaza.',
    contact: 'hello@lunaceremony.demo',
    shippingTime: '1-3 iş günü',
    returnPolicy: '14 gün kolay iade',
    logoUrl: logo('Luna Ceremony', 'EEE9FF'),
    coverUrl: cover('photo-1483985988355-763728e1935b'),
    supportEmail: 'support@lunaceremony.demo',
    supportPhone: '+90 555 010 10 01',
    faq: 'Mezuniyet ve davet ürünlerinde beden değişimi 14 gün içinde yapılabilir.',
    rating: 4.8,
    badges: ['Verified seller', 'Event-ready catalog'],
    trustBadges: ['Hızlı kargo', 'Davet uzmanı', '14 gün iade'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
  {
    sellerId: 'demo-hackathon-noir',
    name: 'Noir Office Club',
    description: 'Ofis, toplantı ve smart casual kombinler için modern iş gardırobu.',
    contact: 'hello@noiroffice.demo',
    shippingTime: '2-4 iş günü',
    returnPolicy: '14 gün iade ve beden değişimi',
    logoUrl: logo('Noir Office', 'E7F5F2'),
    coverUrl: cover('photo-1496747611176-843222e1e57c'),
    supportEmail: 'support@noiroffice.demo',
    supportPhone: '+90 555 010 10 02',
    faq: 'Ofis kapsül koleksiyonunda pantolon-ceket eşleşmeleri AI metadata ile hazırlanır.',
    rating: 4.7,
    badges: ['AI-ready catalog', 'Office capsule'],
    trustBadges: ['Ofis stili', 'Güvenilir beden', 'Kolay değişim'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
  {
    sellerId: 'demo-hackathon-runway-active',
    name: 'Runway Active',
    description: 'Koşu, pilates ve şehir içi athleisure kombinleri için teknik ve konforlu ürünler.',
    contact: 'hello@runwayactive.demo',
    shippingTime: '1-2 iş günü',
    returnPolicy: '30 gün değişim',
    logoUrl: logo('Runway Active', 'EAF2FF'),
    coverUrl: cover('photo-1515886657613-9f3515b0c78f'),
    supportEmail: 'support@runwayactive.demo',
    supportPhone: '+90 555 010 10 03',
    faq: 'Aktif ürünlerde fit feedback önerileri düzenli güncellenir.',
    rating: 4.6,
    badges: ['Sport fit data', 'Fast shipping'],
    trustBadges: ['Spor odaklı', '30 gün değişim', 'Fit feedback'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
  {
    sellerId: 'demo-hackathon-azure',
    name: 'Azure Holiday',
    description: 'Tatil, yaz akşamı ve sahil kombinleri için ferah renkler ve hafif dokular.',
    contact: 'hello@azureholiday.demo',
    shippingTime: '2-3 iş günü',
    returnPolicy: '14 gün iade',
    logoUrl: logo('Azure Holiday', 'E5F6FF'),
    coverUrl: cover('photo-1507525428034-b723cf961d3e'),
    supportEmail: 'support@azureholiday.demo',
    supportPhone: '+90 555 010 10 04',
    faq: 'Tatil ürünleri hafif paketleme ile gönderilir.',
    rating: 4.5,
    badges: ['Vacation edits', 'Summer-ready'],
    trustBadges: ['Yaz koleksiyonu', 'Hafif kumaş', '14 gün iade'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
  {
    sellerId: 'demo-hackathon-nura',
    name: 'Nura Modest',
    description: 'Kapalı, sade ve modern silüetleri seven kullanıcılar için modest moda seçkisi.',
    contact: 'hello@nuramodest.demo',
    shippingTime: '2-4 iş günü',
    returnPolicy: '14 gün iade',
    logoUrl: logo('Nura Modest', 'F1F2F4'),
    coverUrl: cover('photo-1502716119720-b23a93e5fe1b'),
    supportEmail: 'support@nuramodest.demo',
    supportPhone: '+90 555 010 10 05',
    faq: 'Modest ürünlerde kol, boy ve fit bilgisi açıklamalarda özellikle belirtilir.',
    rating: 4.8,
    badges: ['Modest specialist', 'Covered fit'],
    trustBadges: ['Kapalı kesim', 'Detaylı beden', 'Güvenli seçim'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
  {
    sellerId: 'demo-hackathon-urban-carry',
    name: 'Urban Carry',
    description: 'Sneaker, çanta ve şehirli aksesuarlarla hafta sonu ve günlük kombinleri tamamlar.',
    contact: 'hello@urbancarry.demo',
    shippingTime: '1-3 iş günü',
    returnPolicy: '14 gün iade',
    logoUrl: logo('Urban Carry', 'FFF3E8'),
    coverUrl: cover('photo-1549298916-b41d501d3772'),
    supportEmail: 'support@urbancarry.demo',
    supportPhone: '+90 555 010 10 06',
    faq: 'Sneaker ve çanta ürünlerinde kombin önerileri Chat2Shop metadata ile desteklenir.',
    rating: 4.6,
    badges: ['Sneaker match', 'Weekend essentials'],
    trustBadges: ['Günlük stil', 'Hızlı kargo', 'Kombin uyumu'],
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
  },
];

type ProductSpec = {
  id: string;
  store: DemoStore['sellerId'];
  title: string;
  price: number;
  color: string;
  sizes: string[];
  stock: number;
  visibilityScore: number;
  imageId: string;
  category: Category;
  fit: string;
  modesty: ModestyLevel;
  season: string[];
  styleTags: StyleTag[];
  vibeTags: string[];
  occasionTags: OccasionTag[];
  aiSearchIntents: string[];
  description: string;
  reliability?: number;
};

const specs: ProductSpec[] = [
  { id: 'black-midi-graduation-dress', store: 'demo-hackathon-luna', title: 'Siyah Zarif Midi Mezuniyet Elbisesi', price: 2290, color: 'Siyah', sizes: ['S', 'M', 'L'], stock: 18, visibilityScore: 97, imageId: 'photo-1539008835657-9e8e9680c956', category: 'dress', fit: 'regular', modesty: 'medium-high', season: ['spring', 'summer'], styleTags: ['minimal', 'elegant', 'classic'], vibeTags: ['sade', 'zarif', 'çok açık olmayan'], occasionTags: ['graduation', 'evening', 'wedding guest'], aiSearchIntents: ['mezuniyet için siyah sade elbise', 'çok açık olmayan siyah mezuniyet elbisesi', 'minimal elegant black midi dress'], description: 'Mezuniyet ve davet için sade, zarif ve dengeli kapatıcılıkta siyah midi elbise.' },
  { id: 'navy-satin-evening-dress', store: 'demo-hackathon-luna', title: 'Lacivert Saten Davet Elbisesi', price: 2690, color: 'Lacivert', sizes: ['XS', 'S', 'M'], stock: 9, visibilityScore: 90, imageId: 'photo-1515372039744-b8f02a3ae446', category: 'dress', fit: 'slim', modesty: 'medium', season: ['spring', 'summer'], styleTags: ['elegant', 'classic'], vibeTags: ['saten', 'gece', 'feminen'], occasionTags: ['evening', 'wedding guest', 'graduation'], aiSearchIntents: ['lacivert davet elbisesi', 'saten gece elbisesi', 'mezuniyet için lacivert elbise'], description: 'Parlak saten dokusu ve zarif kesimiyle davetlerde öne çıkan lacivert elbise.' },
  { id: 'ivory-wedding-guest-midi', store: 'demo-hackathon-luna', title: 'Ivory Wedding Guest Midi Dress', price: 2490, color: 'Krem', sizes: ['S', 'M', 'L'], stock: 13, visibilityScore: 91, imageId: 'photo-1496747611176-843222e1e57c', category: 'dress', fit: 'regular', modesty: 'medium', season: ['spring', 'summer'], styleTags: ['elegant', 'classic', 'clean girl'], vibeTags: ['soft', 'romantic', 'light event'], occasionTags: ['wedding guest', 'evening', 'summer'], aiSearchIntents: ['düğün daveti açık renk elbise', 'ivory wedding guest midi', 'zarif krem davet elbisesi'], description: 'Düğün davetleri için açık renkli, zarif ve romantik midi elbise.' },
  { id: 'emerald-event-wrap-dress', store: 'demo-hackathon-luna', title: 'Emerald Wrap Event Dress', price: 2190, color: 'Yeşil', sizes: ['S', 'M', 'L', 'XL'], stock: 16, visibilityScore: 84, imageId: 'photo-1502716119720-b23a93e5fe1b', category: 'dress', fit: 'regular', modesty: 'medium-high', season: ['spring', 'fall'], styleTags: ['elegant', 'classic'], vibeTags: ['refined', 'covered enough', 'color statement'], occasionTags: ['wedding guest', 'dinner', 'evening'], aiSearchIntents: ['yeşil davet elbisesi', 'çok açık olmayan renkli elbise', 'wrap event dress'], description: 'Davet ve akşam yemeği için yeşil tonlarda, dengeli kapatıcılığa sahip wrap elbise.' },
  { id: 'minimal-gold-event-earrings', store: 'demo-hackathon-luna', title: 'Minimal Gold Event Earrings', price: 490, color: 'Altın', sizes: ['STD'], stock: 44, visibilityScore: 89, imageId: 'photo-1535632066927-ab7c9ab60908', category: 'accessory', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'elegant', 'classic'], vibeTags: ['subtle', 'refined', 'event ready'], occasionTags: ['graduation', 'evening', 'wedding guest'], aiSearchIntents: ['mezuniyet küpesi', 'minimal altın küpe', 'davet aksesuarı'], description: 'Sade elbise ve davet kombinlerini tamamlayan minimal altın küpe.' },
  { id: 'small-black-event-bag', store: 'demo-hackathon-luna', title: 'Small Black Event Shoulder Bag', price: 1190, color: 'Siyah', sizes: ['STD'], stock: 27, visibilityScore: 88, imageId: 'photo-1594223274512-ad4803739b7c', category: 'bag', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'classic', 'elegant'], vibeTags: ['compact', 'polished', 'event ready'], occasionTags: ['graduation', 'evening', 'wedding guest'], aiSearchIntents: ['siyah mezuniyet çantası', 'minimal davet çantası', 'small black evening bag'], description: 'Mezuniyet ve davet kombinleri için küçük siyah omuz çantası.' },
  { id: 'nude-comfort-event-heel', store: 'demo-hackathon-luna', title: 'Nude Comfortable Block Heel', price: 1590, color: 'Nude', sizes: ['36', '37', '38', '39', '40'], stock: 16, visibilityScore: 87, imageId: 'photo-1543163521-1bf539c55dd2', category: 'shoes', fit: 'regular', modesty: 'high', season: ['spring', 'summer'], styleTags: ['elegant', 'classic', 'minimal'], vibeTags: ['formal', 'balanced', 'comfortable'], occasionTags: ['graduation', 'wedding guest', 'evening'], aiSearchIntents: ['mezuniyet için rahat topuklu', 'nude block heel', 'davet topuklu ayakkabı'], description: 'Uzun etkinliklerde daha rahat duruş sağlayan nude blok topuklu ayakkabı.' },
  { id: 'black-structured-blazer-dress', store: 'demo-hackathon-luna', title: 'Black Structured Blazer Dress', price: 2390, color: 'Siyah', sizes: ['S', 'M', 'L', 'XL'], stock: 12, visibilityScore: 86, imageId: 'photo-1591047139829-d91aecb6caea', category: 'dress', fit: 'structured', modesty: 'medium-high', season: ['fall', 'spring'], styleTags: ['minimal', 'smart casual', 'classic'], vibeTags: ['confident', 'modern', 'structured'], occasionTags: ['office', 'graduation', 'dinner'], aiSearchIntents: ['siyah blazer elbise', 'minimal mezuniyet look', 'smart casual dress'], description: 'Blazer formunda, modern ve güçlü silüetli siyah elbise.' },
  { id: 'soft-pink-date-dress', store: 'demo-hackathon-luna', title: 'Soft Pink Romantic Date Dress', price: 1790, color: 'Pembe', sizes: ['XS', 'S', 'M', 'L'], stock: 15, visibilityScore: 84, imageId: 'photo-1524504388940-b1c1722653e1', category: 'dress', fit: 'relaxed', modesty: 'medium', season: ['summer'], styleTags: ['bohemian', 'elegant'], vibeTags: ['soft', 'romantic', 'date night'], occasionTags: ['dinner', 'evening', 'weekend'], aiSearchIntents: ['romantik date elbisesi', 'pembe zarif elbise', 'soft date night dress'], description: 'Romantik date ve yaz akşamları için yumuşak pembe tonlu elbise.' },
  { id: 'black-evening-slim-dress', store: 'demo-hackathon-luna', title: 'Black Slim Evening Dress', price: 2590, color: 'Siyah', sizes: ['XS', 'S', 'M'], stock: 10, visibilityScore: 83, imageId: 'photo-1485968579580-b6d095142e6e', category: 'dress', fit: 'slim', modesty: 'medium', season: ['all season'], styleTags: ['elegant', 'classic'], vibeTags: ['night out', 'polished', 'dressy'], occasionTags: ['evening', 'dinner', 'wedding guest'], aiSearchIntents: ['siyah gece elbisesi', 'daha şık alternatif', 'black date evening dress'], description: 'Akşam yemeği ve davetler için daha şık siyah slim elbise.' },
];

const storesById = new Map(demoStores.map((store) => [store.sellerId, store]));

function product(spec: ProductSpec): Product {
  const store = storesById.get(spec.store);
  if (!store) throw new Error(`Missing demo store for product ${spec.id}: ${spec.store}`);
  return {
    id: `demo-hackathon-${spec.id}`,
    title: spec.title,
    seller: store.name,
    sellerId: store.sellerId,
    price: spec.price,
    color: spec.color,
    sizes: spec.sizes,
    stock: spec.stock,
    status: 'active',
    source: 'firebase-seller',
    sizeChart: spec.sizes.map((size) => ({ size, chest: '', waist: '', hip: '', length: '' })),
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
    visibilityScore: spec.visibilityScore,
    imageUrl: image(spec.imageId),
    category: spec.category,
    fit: spec.fit,
    modesty: spec.modesty,
    season: spec.season,
    styleTags: spec.styleTags,
    vibeTags: spec.vibeTags,
    occasionTags: spec.occasionTags,
    aiSearchIntents: spec.aiSearchIntents,
    description: spec.description,
    sellerReliability: spec.reliability ?? Math.round(store.rating * 20),
  };
}

const extraSpecs: ProductSpec[] = [
  { id: 'white-oversize-office-shirt', store: 'demo-hackathon-noir', title: 'White Oversize Office Shirt', price: 890, color: 'Beyaz', sizes: ['S', 'M', 'L', 'XL'], stock: 36, visibilityScore: 82, imageId: 'photo-1551803091-e20673f15770', category: 'shirt', fit: 'oversize', modesty: 'high', season: ['spring', 'summer', 'fall'], styleTags: ['minimal', 'casual', 'smart casual'], vibeTags: ['clean', 'relaxed', 'versatile'], occasionTags: ['office', 'daily', 'weekend'], aiSearchIntents: ['ofis için beyaz oversize gömlek', 'smart casual beyaz gömlek', 'minimal white office shirt'], description: 'Ofis ve günlük kullanım için temiz görünümlü oversize beyaz gömlek.' },
  { id: 'black-tailored-office-pants', store: 'demo-hackathon-noir', title: 'Black Tailored Office Pants', price: 1490, color: 'Siyah', sizes: ['S', 'M', 'L'], stock: 20, visibilityScore: 90, imageId: 'photo-1594633312681-425c7b97ccd1', category: 'pants', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'classic', 'smart casual'], vibeTags: ['professional', 'clean', 'structured'], occasionTags: ['office', 'daily', 'dinner'], aiSearchIntents: ['ofis için siyah kumaş pantolon', 'smart casual pantolon', 'minimal tailored pants'], description: 'Ofis ve smart casual kombinler için siyah kumaş pantolon.' },
  { id: 'linen-beige-office-blazer', store: 'demo-hackathon-noir', title: 'Linen Beige Office Blazer', price: 2190, color: 'Bej', sizes: ['S', 'M', 'L'], stock: 11, visibilityScore: 86, imageId: 'photo-1548624313-0396c75e4b1a', category: 'jacket', fit: 'regular', modesty: 'high', season: ['spring', 'summer'], styleTags: ['old money', 'smart casual', 'classic'], vibeTags: ['polished', 'effortless', 'quiet luxury'], occasionTags: ['office', 'dinner', 'daily'], aiSearchIntents: ['ofis smart casual blazer', 'bej keten blazer', 'old money ofis kombini'], description: 'Hafif keten dokulu bej blazer; ofis kombinlerini yazın da ferah tutar.' },
  { id: 'navy-relaxed-office-shirt', store: 'demo-hackathon-noir', title: 'Navy Relaxed Office Shirt', price: 990, color: 'Lacivert', sizes: ['S', 'M', 'L', 'XL'], stock: 24, visibilityScore: 80, imageId: 'photo-1503342217505-b0a15ec3261c', category: 'shirt', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['classic', 'smart casual'], vibeTags: ['professional', 'easy', 'balanced'], occasionTags: ['office', 'daily'], aiSearchIntents: ['lacivert ofis gömleği', 'professional smart casual shirt', 'rahat ofis gömleği'], description: 'Toplantı ve günlük ofis akışı için dengeli lacivert gömlek.' },
  { id: 'cream-wide-leg-work-pants', store: 'demo-hackathon-noir', title: 'Cream Wide Leg Work Pants', price: 1590, color: 'Krem', sizes: ['XS', 'S', 'M', 'L'], stock: 14, visibilityScore: 81, imageId: 'photo-1509631179647-0177331693ae', category: 'pants', fit: 'wide leg', modesty: 'high', season: ['spring', 'summer'], styleTags: ['clean girl', 'minimal', 'old money'], vibeTags: ['soft', 'elevated', 'comfortable'], occasionTags: ['office', 'daily', 'holiday'], aiSearchIntents: ['krem ofis pantolonu', 'clean girl pants', 'summer office pants'], description: 'Hafif ve geniş paçalı krem pantolon; yaz ofis kombinlerine uygundur.' },
  { id: 'classic-beige-trench', store: 'demo-hackathon-noir', title: 'Classic Beige Trench Coat', price: 2990, color: 'Bej', sizes: ['S', 'M', 'L'], stock: 8, visibilityScore: 84, imageId: 'photo-1529139574466-a303027c1d8b', category: 'jacket', fit: 'regular', modesty: 'high', season: ['fall', 'spring'], styleTags: ['classic', 'old money', 'smart casual'], vibeTags: ['timeless', 'polished', 'layered'], occasionTags: ['office', 'daily', 'dinner'], aiSearchIntents: ['bej trençkot ofis kombini', 'classic trench coat', 'old money coat'], description: 'Geçiş mevsimleri için zamansız bej trençkot.' },
  { id: 'black-leather-office-loafer', store: 'demo-hackathon-noir', title: 'Black Leather Office Loafer', price: 1890, color: 'Siyah', sizes: ['36', '37', '38', '39', '40'], stock: 20, visibilityScore: 88, imageId: 'photo-1614252369475-531eba835eb1', category: 'shoes', fit: 'regular', modesty: 'high', season: ['fall', 'spring'], styleTags: ['classic', 'smart casual', 'minimal'], vibeTags: ['professional', 'polished', 'comfortable'], occasionTags: ['office', 'daily', 'dinner'], aiSearchIntents: ['ofis loafer', 'siyah loafer smart casual', 'comfortable office shoes'], description: 'Ofis kombinlerine profesyonel görünüm veren siyah loafer.' },
  { id: 'charcoal-soft-blazer', store: 'demo-hackathon-noir', title: 'Charcoal Soft Blazer', price: 2290, color: 'Gri', sizes: ['S', 'M', 'L', 'XL'], stock: 13, visibilityScore: 82, imageId: 'photo-1591047139829-d91aecb6caea', category: 'jacket', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'smart casual', 'classic'], vibeTags: ['soft tailoring', 'meeting ready', 'neutral'], occasionTags: ['office', 'dinner', 'daily'], aiSearchIntents: ['gri ofis blazer', 'smart casual ceket', 'meeting ready blazer'], description: 'Toplantıdan akşam yemeğine geçebilen yumuşak yapılı gri blazer.' },
  { id: 'blue-pinstripe-work-shirt', store: 'demo-hackathon-noir', title: 'Blue Pinstripe Work Shirt', price: 1090, color: 'Mavi', sizes: ['XS', 'S', 'M', 'L'], stock: 18, visibilityScore: 79, imageId: 'photo-1551803091-e20673f15770', category: 'shirt', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['classic', 'smart casual'], vibeTags: ['crisp', 'workwear', 'fresh'], occasionTags: ['office', 'daily'], aiSearchIntents: ['mavi çizgili ofis gömleği', 'fresh work shirt', 'smart casual mavi gömlek'], description: 'Klasik ofis stilini tazeleyen mavi çizgili gömlek.' },
  { id: 'black-pencil-midi-skirt', store: 'demo-hackathon-noir', title: 'Black Pencil Midi Skirt', price: 1290, color: 'Siyah', sizes: ['S', 'M', 'L'], stock: 15, visibilityScore: 78, imageId: 'photo-1583496661160-fb5886a0aaaa', category: 'pants', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['classic', 'smart casual', 'minimal'], vibeTags: ['professional', 'feminine', 'clean'], occasionTags: ['office', 'dinner'], aiSearchIntents: ['siyah ofis eteği', 'klasik midi etek', 'smart casual office bottom'], description: 'Ofis için klasik ve temiz çizgide siyah midi etek alternatifi.' },
  { id: 'black-running-leggings', store: 'demo-hackathon-runway-active', title: 'Black Running Leggings', price: 990, color: 'Siyah', sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 34, visibilityScore: 89, imageId: 'photo-1515886657613-9f3515b0c78f', category: 'pants', fit: 'slim', modesty: 'high', season: ['all season'], styleTags: ['sporty', 'minimal'], vibeTags: ['performance', 'stretch', 'running'], occasionTags: ['sport', 'daily'], aiSearchIntents: ['koşu için siyah tayt', 'running leggings', 'spor tayt'], description: 'Koşu ve antrenman için esnek, toparlayıcı siyah tayt.' },
  { id: 'mint-training-top', store: 'demo-hackathon-runway-active', title: 'Mint Training Top', price: 690, color: 'Yeşil', sizes: ['XS', 'S', 'M', 'L'], stock: 28, visibilityScore: 78, imageId: 'photo-1515886657613-9f3515b0c78f', category: 'shirt', fit: 'regular', modesty: 'medium-high', season: ['spring', 'summer'], styleTags: ['sporty', 'casual'], vibeTags: ['breathable', 'fresh', 'training'], occasionTags: ['sport', 'daily'], aiSearchIntents: ['koşu üstü', 'mint training top', 'spor tişört'], description: 'Koşu ve pilates için ferah renkli, nefes alan training top.' },
  { id: 'white-running-sneaker', store: 'demo-hackathon-runway-active', title: 'White Running Sneaker', price: 1990, color: 'Beyaz', sizes: ['36', '37', '38', '39', '40', '41'], stock: 26, visibilityScore: 92, imageId: 'photo-1542291026-7eec264c27ff', category: 'shoes', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['sporty', 'casual', 'minimal'], vibeTags: ['lightweight', 'comfortable', 'running'], occasionTags: ['sport', 'daily', 'weekend'], aiSearchIntents: ['koşu için beyaz sneaker', 'rahat koşu ayakkabısı', 'white running sneaker'], description: 'Hafif tabanlı beyaz koşu sneakerı; spor ve günlük kullanıma uygundur.' },
  { id: 'charcoal-cargo-jogger', store: 'demo-hackathon-runway-active', title: 'Charcoal Cargo Jogger', price: 1390, color: 'Gri', sizes: ['S', 'M', 'L', 'XL'], stock: 25, visibilityScore: 79, imageId: 'photo-1515886657613-9f3515b0c78f', category: 'pants', fit: 'relaxed', modesty: 'high', season: ['all season'], styleTags: ['streetwear', 'casual', 'sporty'], vibeTags: ['utility', 'relaxed', 'urban'], occasionTags: ['daily', 'weekend', 'sport'], aiSearchIntents: ['gri jogger pantolon', 'streetwear cargo pants', 'hafta sonu rahat pantolon'], description: 'Rahat sokak stili ve aktif günler için gri cargo jogger.' },
  { id: 'zip-running-jacket', store: 'demo-hackathon-runway-active', title: 'Lightweight Zip Running Jacket', price: 1690, color: 'Mavi', sizes: ['S', 'M', 'L'], stock: 17, visibilityScore: 80, imageId: 'photo-1520975954732-35dd22299614', category: 'jacket', fit: 'regular', modesty: 'high', season: ['spring', 'fall'], styleTags: ['sporty', 'casual'], vibeTags: ['windbreaker', 'light', 'active'], occasionTags: ['sport', 'weekend'], aiSearchIntents: ['koşu ceketi', 'hafif spor ceket', 'running windbreaker'], description: 'Serin havalarda koşu ve yürüyüş için hafif fermuarlı ceket.' },
  { id: 'soft-pilates-set-top', store: 'demo-hackathon-runway-active', title: 'Soft Pilates Long Sleeve', price: 890, color: 'Krem', sizes: ['XS', 'S', 'M', 'L'], stock: 20, visibilityScore: 76, imageId: 'photo-1515886657613-9f3515b0c78f', category: 'shirt', fit: 'slim', modesty: 'medium-high', season: ['all season'], styleTags: ['sporty', 'clean girl', 'minimal'], vibeTags: ['soft', 'studio', 'pilates'], occasionTags: ['sport', 'daily'], aiSearchIntents: ['pilates üstü', 'clean girl spor üst', 'soft active long sleeve'], description: 'Pilates ve düşük tempolu antrenman için yumuşak uzun kollu üst.' },
  { id: 'sport-duffle-bag', store: 'demo-hackathon-runway-active', title: 'Compact Sport Duffle Bag', price: 1190, color: 'Siyah', sizes: ['STD'], stock: 22, visibilityScore: 74, imageId: 'photo-1584917865442-de89df76afd3', category: 'bag', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['sporty', 'casual'], vibeTags: ['gym', 'compact', 'practical'], occasionTags: ['sport', 'daily'], aiSearchIntents: ['spor çantası', 'gym duffle bag', 'koşu çantası'], description: 'Antrenman ve günlük spor ekipmanları için kompakt siyah çanta.' },
  { id: 'performance-ankle-socks', store: 'demo-hackathon-runway-active', title: 'Performance Ankle Socks', price: 290, color: 'Beyaz', sizes: ['36-40', '41-45'], stock: 60, visibilityScore: 68, imageId: 'photo-1549298916-b41d501d3772', category: 'accessory', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['sporty', 'minimal'], vibeTags: ['breathable', 'running', 'basic'], occasionTags: ['sport', 'daily'], aiSearchIntents: ['koşu çorabı', 'spor çorap', 'performance socks'], description: 'Koşu ayakkabılarıyla uyumlu nefes alan bilek çorabı.' },
  { id: 'olive-athleisure-hoodie', store: 'demo-hackathon-runway-active', title: 'Olive Athleisure Hoodie', price: 1290, color: 'Yeşil', sizes: ['S', 'M', 'L', 'XL'], stock: 21, visibilityScore: 77, imageId: 'photo-1520975954732-35dd22299614', category: 'jacket', fit: 'oversize', modesty: 'high', season: ['fall', 'winter'], styleTags: ['sporty', 'casual', 'streetwear'], vibeTags: ['cozy', 'urban', 'weekend'], occasionTags: ['weekend', 'daily', 'sport'], aiSearchIntents: ['hafta sonu hoodie', 'athleisure sweatshirt', 'spor rahat hoodie'], description: 'Spor sonrası ve hafta sonu kombinleri için rahat olive hoodie.' },
  { id: 'black-training-shorts', store: 'demo-hackathon-runway-active', title: 'Black Training Shorts', price: 790, color: 'Siyah', sizes: ['XS', 'S', 'M', 'L'], stock: 30, visibilityScore: 70, imageId: 'photo-1503342217505-b0a15ec3261c', category: 'pants', fit: 'regular', modesty: 'medium', season: ['summer'], styleTags: ['sporty', 'casual'], vibeTags: ['training', 'lightweight', 'summer sport'], occasionTags: ['sport', 'summer'], aiSearchIntents: ['spor şortu', 'koşu şortu', 'black training shorts'], description: 'Yaz koşuları ve antrenman için hafif siyah spor şortu.' },
  { id: 'blue-summer-midi-dress', store: 'demo-hackathon-azure', title: 'Blue Summer Midi Dress', price: 1890, color: 'Mavi', sizes: ['S', 'M', 'L'], stock: 22, visibilityScore: 88, imageId: 'photo-1496747611176-843222e1e57c', category: 'dress', fit: 'regular', modesty: 'medium', season: ['summer'], styleTags: ['casual', 'clean girl', 'minimal'], vibeTags: ['fresh', 'soft', 'summer evening'], occasionTags: ['summer', 'holiday', 'daily'], aiSearchIntents: ['mavi yaz elbisesi', 'tatil için midi elbise', 'summer evening dress'], description: 'Yaz akşamları için hafif, mavi tonlarda rahat midi elbise.' },
  { id: 'white-linen-resort-shirt', store: 'demo-hackathon-azure', title: 'White Linen Resort Shirt', price: 990, color: 'Beyaz', sizes: ['S', 'M', 'L', 'XL'], stock: 29, visibilityScore: 84, imageId: 'photo-1551803091-e20673f15770', category: 'shirt', fit: 'regular', modesty: 'high', season: ['summer'], styleTags: ['minimal', 'casual', 'old money'], vibeTags: ['linen', 'resort', 'fresh'], occasionTags: ['holiday', 'summer', 'weekend'], aiSearchIntents: ['tatil için keten gömlek', 'beyaz yaz gömleği', 'resort linen shirt'], description: 'Tatil ve sahil akşamları için nefes alan beyaz keten gömlek.' },
  { id: 'sand-linen-shorts', store: 'demo-hackathon-azure', title: 'Sand Linen Shorts', price: 890, color: 'Bej', sizes: ['S', 'M', 'L'], stock: 20, visibilityScore: 75, imageId: 'photo-1509631179647-0177331693ae', category: 'pants', fit: 'regular', modesty: 'medium-high', season: ['summer'], styleTags: ['casual', 'minimal', 'old money'], vibeTags: ['beach', 'linen', 'easy'], occasionTags: ['holiday', 'summer', 'weekend'], aiSearchIntents: ['tatil şortu', 'keten şort', 'summer resort shorts'], description: 'Yaz tatili ve hafta sonu için bej keten şort.' },
  { id: 'straw-weekend-tote', store: 'demo-hackathon-azure', title: 'Straw Weekend Tote', price: 790, color: 'Krem', sizes: ['STD'], stock: 25, visibilityScore: 80, imageId: 'photo-1584917865442-de89df76afd3', category: 'bag', fit: 'standard', modesty: 'high', season: ['summer'], styleTags: ['casual', 'bohemian', 'clean girl'], vibeTags: ['beach', 'natural', 'holiday'], occasionTags: ['holiday', 'summer', 'weekend'], aiSearchIntents: ['tatil çantası', 'hasır tote bag', 'beach tote'], description: 'Sahil ve şehir tatili kombinleri için doğal dokulu tote çanta.' },
  { id: 'cream-slide-sandals', store: 'demo-hackathon-azure', title: 'Cream Slide Sandals', price: 890, color: 'Krem', sizes: ['36', '37', '38', '39', '40'], stock: 18, visibilityScore: 76, imageId: 'photo-1549298916-b41d501d3772', category: 'shoes', fit: 'regular', modesty: 'high', season: ['summer'], styleTags: ['casual', 'minimal'], vibeTags: ['easy', 'beach', 'comfortable'], occasionTags: ['holiday', 'summer', 'daily'], aiSearchIntents: ['tatil sandalet', 'krem terlik sandalet', 'summer slide sandals'], description: 'Tatil valizinde yer kaplamayan rahat krem slide sandalet.' },
  { id: 'turquoise-silk-scarf', store: 'demo-hackathon-azure', title: 'Turquoise Silk Scarf', price: 690, color: 'Mavi', sizes: ['STD'], stock: 19, visibilityScore: 73, imageId: 'https://theatticco.com/cdn/shop/products/SeaBlueShibori3_1024x1024.jpg?v=1588320479', category: 'accessory', fit: 'standard', modesty: 'high', season: ['spring', 'summer'], styleTags: ['classic', 'old money', 'elegant'], vibeTags: ['soft', 'elevated', 'resort'], occasionTags: ['holiday', 'daily', 'summer'], aiSearchIntents: ['mavi ipek fular', 'tatil aksesuarı', 'old money scarf'], description: 'Tatil kombinlerine renk ve zarif doku ekleyen turkuaz ipek fular.' },
  { id: 'coral-holiday-wrap-dress', store: 'demo-hackathon-azure', title: 'Coral Holiday Wrap Dress', price: 1690, color: 'Pembe', sizes: ['XS', 'S', 'M', 'L'], stock: 17, visibilityScore: 79, imageId: 'photo-1524504388940-b1c1722653e1', category: 'dress', fit: 'relaxed', modesty: 'medium', season: ['summer'], styleTags: ['bohemian', 'casual', 'elegant'], vibeTags: ['holiday', 'romantic', 'sunset'], occasionTags: ['holiday', 'summer', 'dinner'], aiSearchIntents: ['tatil akşamı elbisesi', 'coral wrap dress', 'yaz date elbisesi'], description: 'Tatil akşamları ve sahil restoranları için romantik coral wrap elbise.' },
  { id: 'light-blue-cropped-jacket', store: 'demo-hackathon-azure', title: 'Light Blue Cropped Denim Jacket', price: 1290, color: 'Mavi', sizes: ['XS', 'S', 'M', 'L'], stock: 24, visibilityScore: 72, imageId: 'photo-1520975954732-35dd22299614', category: 'jacket', fit: 'cropped', modesty: 'medium-high', season: ['spring', 'summer'], styleTags: ['casual', 'vintage', 'streetwear'], vibeTags: ['relaxed', 'denim', 'weekend'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['mavi denim ceket', 'tatil denim jacket', 'hafta sonu ceket'], description: 'Yaz akşamlarında elbise ve şort üstüne alınabilecek açık mavi denim ceket.' },
  { id: 'ivory-beach-maxi-dress', store: 'demo-hackathon-azure', title: 'Ivory Beach Maxi Dress', price: 1990, color: 'Krem', sizes: ['S', 'M', 'L'], stock: 14, visibilityScore: 82, imageId: 'photo-1496747611176-843222e1e57c', category: 'dress', fit: 'relaxed', modesty: 'medium-high', season: ['summer'], styleTags: ['minimal', 'bohemian', 'casual'], vibeTags: ['beach', 'flowy', 'soft'], occasionTags: ['holiday', 'summer', 'weekend'], aiSearchIntents: ['krem sahil elbisesi', 'beach maxi dress', 'tatil için açık renk elbise'], description: 'Tatil fotoğrafları ve sahil yürüyüşleri için uçuşan krem maxi elbise.' },
  { id: 'sunset-resort-co-ord', store: 'demo-hackathon-azure', title: 'Sunset Resort Co-ord Set', price: 2190, color: 'Bej', sizes: ['S', 'M', 'L'], stock: 12, visibilityScore: 77, imageId: 'photo-1509631179647-0177331693ae', category: 'shirt', fit: 'relaxed', modesty: 'medium-high', season: ['summer'], styleTags: ['casual', 'old money', 'minimal'], vibeTags: ['resort', 'matching set', 'easy'], occasionTags: ['holiday', 'summer', 'dinner'], aiSearchIntents: ['tatil co ord set', 'resort matching set', 'yaz akşam kombini'], description: 'Tek hamlede şık görünen bej resort co-ord set.' },
  { id: 'olive-modest-shirt-dress', store: 'demo-hackathon-nura', title: 'Olive Modest Shirt Dress', price: 1990, color: 'Yeşil', sizes: ['S', 'M', 'L', 'XL'], stock: 21, visibilityScore: 90, imageId: 'photo-1502716119720-b23a93e5fe1b', category: 'dress', fit: 'regular', modesty: 'high', season: ['spring', 'fall'], styleTags: ['modest', 'minimal', 'casual'], vibeTags: ['covered', 'comfortable', 'soft'], occasionTags: ['daily', 'office', 'weekend'], aiSearchIntents: ['kapalı yeşil elbise', 'modest shirt dress', 'çok açık olmayan günlük elbise'], description: 'Kapalı kesim tercih eden kullanıcılar için rahat gömlek elbise.' },
  { id: 'navy-modest-evening-dress', store: 'demo-hackathon-nura', title: 'Navy Modest Evening Dress', price: 2490, color: 'Lacivert', sizes: ['S', 'M', 'L', 'XL'], stock: 13, visibilityScore: 89, imageId: 'photo-1515372039744-b8f02a3ae446', category: 'dress', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['modest', 'elegant', 'classic'], vibeTags: ['covered', 'formal', 'refined'], occasionTags: ['evening', 'wedding guest', 'graduation'], aiSearchIntents: ['kapalı davet elbisesi', 'lacivert modest evening dress', 'çok açık olmayan mezuniyet elbisesi'], description: 'Davet ve mezuniyet için kapalı, zarif lacivert elbise.' },
  { id: 'cream-longline-tunic', store: 'demo-hackathon-nura', title: 'Cream Longline Tunic', price: 1290, color: 'Krem', sizes: ['S', 'M', 'L', 'XL'], stock: 22, visibilityScore: 80, imageId: 'photo-1551803091-e20673f15770', category: 'shirt', fit: 'regular', modesty: 'high', season: ['spring', 'summer'], styleTags: ['modest', 'minimal', 'clean girl'], vibeTags: ['covered', 'soft', 'layered'], occasionTags: ['daily', 'office'], aiSearchIntents: ['krem uzun tunik', 'modest ofis üst', 'kapalı minimal tunik'], description: 'Pantolonlarla rahat eşleşen uzun kesimli krem tunik.' },
  { id: 'black-wide-leg-modest-pants', store: 'demo-hackathon-nura', title: 'Black Wide Leg Modest Pants', price: 1490, color: 'Siyah', sizes: ['S', 'M', 'L', 'XL'], stock: 18, visibilityScore: 82, imageId: 'photo-1594633312681-425c7b97ccd1', category: 'pants', fit: 'wide leg', modesty: 'high', season: ['all season'], styleTags: ['modest', 'minimal', 'classic'], vibeTags: ['covered', 'flowy', 'comfortable'], occasionTags: ['office', 'daily', 'dinner'], aiSearchIntents: ['kapalı kombin pantolon', 'siyah geniş paça pantolon', 'modest office pants'], description: 'Kapalı ve rahat kombinler için geniş paçalı siyah pantolon.' },
  { id: 'taupe-longline-blazer', store: 'demo-hackathon-nura', title: 'Taupe Longline Blazer', price: 2290, color: 'Bej', sizes: ['S', 'M', 'L', 'XL'], stock: 10, visibilityScore: 83, imageId: 'photo-1548624313-0396c75e4b1a', category: 'jacket', fit: 'regular', modesty: 'high', season: ['spring', 'fall'], styleTags: ['modest', 'smart casual', 'classic'], vibeTags: ['longline', 'professional', 'covered'], occasionTags: ['office', 'dinner', 'daily'], aiSearchIntents: ['uzun blazer modest', 'kapalı ofis ceket', 'taupe longline blazer'], description: 'Daha kapalı silüet isteyenler için uzun boy bej blazer.' },
  { id: 'soft-gray-modal-scarf', store: 'demo-hackathon-nura', title: 'Soft Gray Modal Scarf', price: 590, color: 'Gri', sizes: ['STD'], stock: 35, visibilityScore: 76, imageId: 'photo-1520903920243-00d872a2d1c9', category: 'accessory', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['modest', 'minimal', 'classic'], vibeTags: ['soft', 'covered', 'neutral'], occasionTags: ['daily', 'office', 'evening'], aiSearchIntents: ['gri şal', 'modest scarf', 'minimal başörtüsü'], description: 'Günlük ve ofis kombinleriyle uyumlu yumuşak gri modal şal.' },
  { id: 'modest-black-maxi-skirt', store: 'demo-hackathon-nura', title: 'Modest Black Maxi Skirt', price: 1190, color: 'Siyah', sizes: ['S', 'M', 'L', 'XL'], stock: 19, visibilityScore: 78, imageId: 'photo-1583496661160-fb5886a0aaaa', category: 'pants', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['modest', 'classic', 'minimal'], vibeTags: ['covered', 'flowy', 'basic'], occasionTags: ['daily', 'office', 'evening'], aiSearchIntents: ['siyah maxi etek', 'kapalı etek kombini', 'modest black skirt'], description: 'Kapalı kombinlerin temel parçası olacak siyah maxi etek.' },
  { id: 'dusty-blue-covered-dress', store: 'demo-hackathon-nura', title: 'Dusty Blue Covered Dress', price: 2090, color: 'Mavi', sizes: ['S', 'M', 'L', 'XL'], stock: 15, visibilityScore: 85, imageId: 'photo-1496747611176-843222e1e57c', category: 'dress', fit: 'regular', modesty: 'high', season: ['spring', 'summer'], styleTags: ['modest', 'minimal', 'elegant'], vibeTags: ['soft', 'covered', 'fresh'], occasionTags: ['graduation', 'daily', 'wedding guest'], aiSearchIntents: ['kapalı mavi elbise', 'mezuniyet için kapalı elbise', 'dusty blue modest dress'], description: 'Mezuniyet ve günlük özel anlar için açık mavi, kapalı kesimli elbise.' },
  { id: 'white-modest-sneaker', store: 'demo-hackathon-nura', title: 'White Modest Everyday Sneaker', price: 1590, color: 'Beyaz', sizes: ['36', '37', '38', '39', '40'], stock: 22, visibilityScore: 79, imageId: 'photo-1549298916-b41d501d3772', category: 'shoes', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['modest', 'casual', 'minimal'], vibeTags: ['comfortable', 'covered outfit', 'daily'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['kapalı kombin beyaz sneaker', 'rahat günlük ayakkabı', 'white sneaker modest outfit'], description: 'Uzun tunik ve geniş pantolonlarla kolay eşleşen beyaz sneaker.' },
  { id: 'modest-structured-tote', store: 'demo-hackathon-nura', title: 'Structured Modest Tote Bag', price: 990, color: 'Kahverengi', sizes: ['STD'], stock: 24, visibilityScore: 74, imageId: 'photo-1584917865442-de89df76afd3', category: 'bag', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['modest', 'classic', 'minimal'], vibeTags: ['practical', 'structured', 'daily'], occasionTags: ['office', 'daily', 'weekend'], aiSearchIntents: ['kapalı kombin çanta', 'structured tote bag', 'ofis tote çanta'], description: 'Ofis ve günlük modest kombinleri tamamlayan kahverengi tote çanta.' },
  { id: 'white-minimal-weekend-sneaker', store: 'demo-hackathon-urban-carry', title: 'White Minimal Weekend Sneaker', price: 1790, color: 'Beyaz', sizes: ['36', '37', '38', '39', '40'], stock: 32, visibilityScore: 95, imageId: 'photo-1549298916-b41d501d3772', category: 'shoes', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'casual', 'sporty'], vibeTags: ['clean', 'comfortable', 'versatile'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['beyaz sneaker kombini', 'white sneaker outfit', 'minimal white sneaker'], description: 'Elbise, pantolon ve jean kombinlerine uyum sağlayan minimal beyaz sneaker.' },
  { id: 'cream-everyday-tote', store: 'demo-hackathon-urban-carry', title: 'Cream Everyday Tote', price: 990, color: 'Krem', sizes: ['STD'], stock: 30, visibilityScore: 78, imageId: 'photo-1584917865442-de89df76afd3', category: 'bag', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['clean girl', 'casual', 'minimal'], vibeTags: ['practical', 'soft', 'daily'], occasionTags: ['office', 'daily', 'holiday'], aiSearchIntents: ['krem tote çanta', 'daily tote bag', 'clean girl bag'], description: 'Günlük kullanım ve ofis için geniş krem tote çanta.' },
  { id: 'cropped-denim-weekend-jacket', store: 'demo-hackathon-urban-carry', title: 'Cropped Denim Weekend Jacket', price: 1290, color: 'Mavi', sizes: ['XS', 'S', 'M', 'L'], stock: 24, visibilityScore: 76, imageId: 'photo-1520975954732-35dd22299614', category: 'jacket', fit: 'cropped', modesty: 'medium-high', season: ['spring', 'fall'], styleTags: ['streetwear', 'casual', 'vintage'], vibeTags: ['young', 'relaxed', 'denim'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['beyaz sneaker denim ceket kombini', 'hafta sonu denim ceket', 'cropped denim jacket'], description: 'Beyaz sneaker ve günlük elbiselerle iyi çalışan kısa denim ceket.' },
  { id: 'charcoal-street-cargo-pants', store: 'demo-hackathon-urban-carry', title: 'Charcoal Street Cargo Pants', price: 1390, color: 'Gri', sizes: ['S', 'M', 'L', 'XL'], stock: 25, visibilityScore: 80, imageId: 'photo-1515886657613-9f3515b0c78f', category: 'pants', fit: 'relaxed', modesty: 'high', season: ['all season'], styleTags: ['streetwear', 'casual', 'sporty'], vibeTags: ['utility', 'relaxed', 'urban'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['sokak stili cargo pantolon', 'beyaz sneaker cargo kombini', 'streetwear cargo pants'], description: 'Sneaker odaklı hafta sonu kombinleri için gri cargo pantolon.' },
  { id: 'black-crossbody-city-bag', store: 'demo-hackathon-urban-carry', title: 'Black Crossbody City Bag', price: 1090, color: 'Siyah', sizes: ['STD'], stock: 26, visibilityScore: 82, imageId: 'photo-1594223274512-ad4803739b7c', category: 'bag', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['streetwear', 'minimal', 'casual'], vibeTags: ['city', 'compact', 'hands free'], occasionTags: ['daily', 'weekend', 'holiday'], aiSearchIntents: ['siyah crossbody çanta', 'şehir çantası', 'weekend bag'], description: 'Şehir içinde rahat dolaşmak için kompakt siyah crossbody çanta.' },
  { id: 'tan-retro-sneaker', store: 'demo-hackathon-urban-carry', title: 'Tan Retro Sneaker', price: 1690, color: 'Kahverengi', sizes: ['36', '37', '38', '39', '40', '41'], stock: 20, visibilityScore: 81, imageId: 'photo-1549298916-b41d501d3772', category: 'shoes', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['vintage', 'casual', 'streetwear'], vibeTags: ['retro', 'warm', 'weekend'], occasionTags: ['weekend', 'daily'], aiSearchIntents: ['retro sneaker', 'kahverengi sneaker kombini', 'hafta sonu ayakkabısı'], description: 'Hafta sonu ve vintage esintili kombinler için tan retro sneaker.' },
  { id: 'minimal-baseball-cap', store: 'demo-hackathon-urban-carry', title: 'Minimal Baseball Cap', price: 390, color: 'Siyah', sizes: ['STD'], stock: 40, visibilityScore: 69, imageId: 'photo-1582142306909-195724d2c1f5', category: 'accessory', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['casual', 'streetwear', 'sporty'], vibeTags: ['easy', 'urban', 'sun ready'], occasionTags: ['daily', 'weekend', 'sport'], aiSearchIntents: ['siyah şapka', 'streetwear cap', 'hafta sonu aksesuar'], description: 'Sneaker ve denim kombinlerini tamamlayan minimal siyah şapka.' },
  { id: 'ribbed-basic-white-tee', store: 'demo-hackathon-urban-carry', title: 'Ribbed Basic White Tee', price: 590, color: 'Beyaz', sizes: ['XS', 'S', 'M', 'L'], stock: 38, visibilityScore: 73, imageId: 'photo-1503342217505-b0a15ec3261c', category: 'shirt', fit: 'regular', modesty: 'medium-high', season: ['all season'], styleTags: ['minimal', 'casual', 'clean girl'], vibeTags: ['basic', 'layering', 'weekend'], occasionTags: ['daily', 'weekend'], aiSearchIntents: ['beyaz basic tişört', 'sneaker kombini üst', 'minimal weekend tee'], description: 'Beyaz sneaker ve denim ceketle kolay eşleşen basic beyaz tişört.' },
  { id: 'light-wash-straight-jeans', store: 'demo-hackathon-urban-carry', title: 'Light Wash Straight Jeans', price: 1490, color: 'Mavi', sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 22, visibilityScore: 79, imageId: 'photo-1509631179647-0177331693ae', category: 'pants', fit: 'regular', modesty: 'high', season: ['all season'], styleTags: ['casual', 'vintage', 'minimal'], vibeTags: ['denim', 'easy', 'weekend'], occasionTags: ['daily', 'weekend'], aiSearchIntents: ['beyaz sneaker jean kombini', 'light wash jeans', 'hafta sonu jean'], description: 'Beyaz sneaker ile risksiz eşleşen açık yıkama straight jean.' },
  { id: 'silver-mini-hoop-earrings', store: 'demo-hackathon-urban-carry', title: 'Silver Mini Hoop Earrings', price: 450, color: 'Gri', sizes: ['STD'], stock: 42, visibilityScore: 72, imageId: 'photo-1535632066927-ab7c9ab60908', category: 'accessory', fit: 'standard', modesty: 'high', season: ['all season'], styleTags: ['minimal', 'casual', 'classic'], vibeTags: ['small', 'everyday', 'polished'], occasionTags: ['daily', 'weekend', 'office'], aiSearchIntents: ['günlük halka küpe', 'minimal silver earrings', 'sneaker kombini aksesuar'], description: 'Günlük kombinlere küçük ama temiz bir tamamlayıcı ekleyen gümüş halka küpe.' },
];

export const demoProducts: Product[] = [...specs, ...extraSpecs].map(product);

export const demoPrompts = [
  {
    id: 'graduation-black-modest',
    prompt: 'Mezuniyet için siyah, sade ama şık bir elbise arıyorum. Çok açık olmasın.',
    expectedTopProductIds: ['demo-hackathon-black-midi-graduation-dress', 'demo-hackathon-black-structured-blazer-dress', 'demo-hackathon-navy-modest-evening-dress'],
  },
  {
    id: 'office-smart-casual',
    prompt: 'Ofis için smart casual ama rahat bir kombin öner.',
    expectedTopProductIds: ['demo-hackathon-linen-beige-office-blazer', 'demo-hackathon-black-tailored-office-pants', 'demo-hackathon-white-oversize-office-shirt'],
  },
  {
    id: 'white-sneaker-weekend',
    prompt: 'Beyaz sneaker ile uyumlu hafta sonu kombini istiyorum.',
    expectedTopProductIds: ['demo-hackathon-white-minimal-weekend-sneaker', 'demo-hackathon-cropped-denim-weekend-jacket', 'demo-hackathon-light-wash-straight-jeans'],
  },
  {
    id: 'romantic-date-dress',
    prompt: 'Romantik bir date için zarif ama abartısız elbise bul.',
    expectedTopProductIds: ['demo-hackathon-soft-pink-date-dress', 'demo-hackathon-coral-holiday-wrap-dress', 'demo-hackathon-black-evening-slim-dress'],
  },
  {
    id: 'running-outfit',
    prompt: 'Koşu için rahat ve şık parçalar öner.',
    expectedTopProductIds: ['demo-hackathon-black-running-leggings', 'demo-hackathon-white-running-sneaker', 'demo-hackathon-zip-running-jacket'],
  },
  {
    id: 'wedding-light-elegant',
    prompt: 'Düğün daveti için açık renk, zarif bir kombin istiyorum.',
    expectedTopProductIds: ['demo-hackathon-ivory-wedding-guest-midi', 'demo-hackathon-nude-comfort-event-heel', 'demo-hackathon-minimal-gold-event-earrings'],
  },
  {
    id: 'summer-holiday',
    prompt: 'Yaz tatili için hafif ve ferah parçalar bul.',
    expectedTopProductIds: ['demo-hackathon-blue-summer-midi-dress', 'demo-hackathon-white-linen-resort-shirt', 'demo-hackathon-straw-weekend-tote'],
  },
  {
    id: 'modest-office',
    prompt: 'Kapalı, sade ve modern bir ofis kombini istiyorum.',
    expectedTopProductIds: ['demo-hackathon-cream-longline-tunic', 'demo-hackathon-black-wide-leg-modest-pants', 'demo-hackathon-taupe-longline-blazer', 'demo-hackathon-olive-modest-shirt-dress'],
  },
];

export function assertDemoCatalogShape() {
  if (demoStores.length !== 6) throw new Error(`Expected 6 demo stores, got ${demoStores.length}.`);
  if (demoProducts.length !== 60) throw new Error(`Expected 60 demo products, got ${demoProducts.length}.`);
  const ids = new Set(demoProducts.map((item) => item.id));
  if (ids.size !== demoProducts.length) throw new Error('Demo product IDs must be unique.');
  for (const item of demoProducts) {
    if (!item.id.startsWith('demo-hackathon-')) throw new Error(`Invalid demo product id: ${item.id}`);
    if (!item.sellerId.startsWith('demo-hackathon-')) throw new Error(`Invalid demo seller id: ${item.sellerId}`);
    if (item.status !== 'active') throw new Error(`Demo product must be active: ${item.id}`);
    if (item.aiSearchIntents.length < 3) throw new Error(`Demo product needs rich intents: ${item.id}`);
  }
}
