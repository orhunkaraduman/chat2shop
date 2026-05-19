import { router } from 'expo-router';
import {
  AlertCircle,
  Archive,
  BarChart3,
  Bell,
  CreditCard,
  CircleDollarSign,
  CircleHelp,
  ClipboardList,
  ChevronRight,
  Edit3,
  Eye,
  Heart,
  LogOut,
  MapPin,
  PackageCheck,
  PackagePlus,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tags,
  TrendingUp,
  Truck,
  UserRound,
  WandSparkles,
} from 'lucide-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card, ScrollScreen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import {
  SellerMetricTile,
  SellerScreenShell,
  SellerSection,
  SellerStatusPill,
} from '@/components/seller/SellerUI';
import { colors, formatPrice } from '@/theme';
import { useAppState } from '@/state/AppContext';
import {
  AddressBookEntry,
  AnalyticsEvent,
  CheckoutDetails,
  Order,
  Product,
  SellerCreditAccount,
  SavedPaymentMethod,
  SellerOrder,
  StyleProfile,
  StyleTag,
} from '@/types';

const styleOptions: StyleTag[] = ['minimal', 'elegant', 'classic', 'smart casual', 'casual', 'modest', 'old money', 'clean girl'];
const occasionOptions = ['Mezuniyet', 'Davet', 'Ofis', 'Günlük', 'Tatil'];
const colorOptions = ['Siyah', 'Beyaz', 'Mavi', 'Krem', 'Bej', 'Nude'];

export default function ProfileScreen() {
  const {
    currentUser,
    orders,
    favoriteProductIds,
    addressBook,
    paymentMethods,
    checkoutDetails,
    analyticsEvents,
    sellerProducts,
    sellerCreditAccount,
    sellerOrders,
    generatedListing,
    loadBuyerSellerOrders,
    signOut,
  } = useAppState();

  const isSeller = currentUser?.role === 'seller';

  useEffect(() => {
    if (currentUser?.role === 'buyer') {
      void loadBuyerSellerOrders();
    }
  }, [currentUser?.id, currentUser?.role]);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  if (isSeller) {
    return (
      <SellerProfile
        email={currentUser.email}
        sellerProducts={sellerProducts}
        sellerCreditAccount={sellerCreditAccount}
        generatedScore={generatedListing?.visibilityScore}
        generatedCount={analyticsEvents.filter((event) => event.name === 'seller_listing_generated').length}
        publishedCount={analyticsEvents.filter((event) => event.name === 'seller_listing_published').length}
        sellerOrders={sellerOrders}
        analyticsEvents={analyticsEvents}
        onOpenSellerPanel={() => router.push('/seller')}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <BuyerProfile
      email={currentUser?.email}
      orders={orders}
      favoriteProductIds={favoriteProductIds}
      addressBook={addressBook}
      paymentMethods={paymentMethods}
      checkoutDetails={checkoutDetails}
      onSignOut={handleSignOut}
    />
  );
}

function BuyerProfile({
  email,
  orders,
  favoriteProductIds,
  addressBook,
  paymentMethods,
  checkoutDetails,
  onSignOut,
}: {
  email?: string;
  orders: Order[];
  favoriteProductIds: string[];
  addressBook: AddressBookEntry[];
  paymentMethods: SavedPaymentMethod[];
  checkoutDetails: CheckoutDetails;
  onSignOut: () => void;
}) {
  const selectedAddress =
    addressBook.find((address) => address.id === checkoutDetails.addressId) ??
    addressBook.find((address) => address.isDefault) ??
    addressBook[0];
  const selectedPaymentMethod =
    paymentMethods.find((paymentMethod) => paymentMethod.id === checkoutDetails.paymentMethodId) ??
    paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ??
    paymentMethods[0];
  return (
    <SafeAreaView style={styles.buyerSafe} edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.buyerContent} showsVerticalScrollIndicator={false}>
        <AnimatedEntrance delay={0}>
          <ProfileHeader email={email} orderCount={orders.length} favoriteCount={favoriteProductIds.length} onSignOut={onSignOut} />
        </AnimatedEntrance>
        <AnimatedEntrance delay={80}>
          <View style={styles.buyerQuickGrid}>
            <QuickActionTile
              icon={<ShoppingBag size={18} color={colors.commerce} />}
              label="Siparişlerim"
              value={`${orders.length} sipariş`}
              onPress={() => router.push('/orders')}
            />
            <QuickActionTile
              icon={<Heart size={18} color={colors.favorite} />}
              label="Favorilerim"
              value={`${favoriteProductIds.length} ürün`}
              onPress={() => router.push('/favorites')}
            />
            <QuickActionTile
              icon={<MapPin size={18} color={colors.trust} />}
              label="Adreslerim"
              value={selectedAddress ? selectedAddress.label : 'Adres yok'}
              onPress={() => router.push('/addresses')}
            />
            <QuickActionTile
              icon={<CreditCard size={18} color={colors.info} />}
              label="Ödeme"
              value={selectedPaymentMethod ? paymentMethodShortLabel(selectedPaymentMethod) : 'Yöntem yok'}
              onPress={() => router.push('/payments')}
            />
          </View>
        </AnimatedEntrance>
        <AnimatedEntrance delay={150}>
          <AccountSettingsSection onSignOut={onSignOut} />
        </AnimatedEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileHeader({
  email,
  orderCount,
  favoriteCount,
  onSignOut,
}: {
  email?: string;
  orderCount: number;
  favoriteCount: number;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{getInitials(email)}</Text>
      </View>
      <View style={styles.profileHeaderBody}>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>Müşteri hesabı</Text>
        </View>
        <Text style={styles.profileTitle}>Profil</Text>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {email ?? 'Giriş yapılmadı'}
        </Text>
        <View style={styles.profileStats}>
          <Text style={styles.profileStatText}>{orderCount} sipariş</Text>
          <Text style={styles.profileStatDot}>•</Text>
          <Text style={styles.profileStatText}>{favoriteCount} favori</Text>
        </View>
      </View>
      <Pressable style={styles.profileLogout} onPress={onSignOut} hitSlop={8}>
        <LogOut size={17} color={colors.inkStrong} />
      </Pressable>
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <AnimatedPressable style={styles.quickTile} onPress={onPress} disabled={!onPress}>
      <View style={styles.quickTileIcon}>{icon}</View>
      <Text style={styles.quickTileLabel}>{label}</Text>
      <Text style={styles.quickTileValue} numberOfLines={1}>
        {value}
      </Text>
      {onPress ? <ChevronRight size={15} color={colors.mutedSoft} style={styles.quickTileArrow} /> : null}
    </AnimatedPressable>
  );
}

function AccountSettingsSection({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.settingsSection}>
      <View style={styles.settingsHeader}>
        <Text style={styles.settingsTitle}>Yardım ve ayarlar</Text>
        <Text style={styles.settingsSubtitle}>Hesap tercihlerini ve destek konularını buradan yönet.</Text>
      </View>
      <View style={styles.settingsList}>
        <SettingsRow
          icon={<Bell size={17} color={colors.info} />}
          title="Bildirim tercihleri"
          subtitle="Sipariş, kampanya ve AI öneri bildirimleri"
          onPress={() => router.push({ pathname: '/settings/[section]', params: { section: 'notifications' } })}
        />
        <SettingsRow
          icon={<CircleHelp size={17} color={colors.ai} />}
          title="Yardım merkezi"
          subtitle="Sipariş, iade ve kabin kullanımı hakkında destek"
          onPress={() => router.push({ pathname: '/settings/[section]', params: { section: 'help' } })}
        />
        <SettingsRow
          icon={<ShieldCheck size={17} color={colors.info} />}
          title="Gizlilik ve güvenlik"
          subtitle="Veri, fotoğraf ve hesap güvenliği tercihleri"
          onPress={() => router.push({ pathname: '/settings/[section]', params: { section: 'privacy' } })}
        />
        <SettingsRow
          icon={<LogOut size={17} color={colors.danger} />}
          title="Çıkış yap"
          subtitle="Bu cihazdaki oturumu kapat"
          onPress={onSignOut}
          destructive
        />
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <AnimatedPressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={[styles.settingsRowTitle, destructive && styles.settingsRowTitleDanger]}>{title}</Text>
        <Text style={styles.settingsRowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.mutedSoft} />
    </AnimatedPressable>
  );
}

function ProfileSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.profileSection}>
      <View style={styles.profileSectionHeader}>
        <View style={styles.flex}>
          <Text style={styles.profileSectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.profileSectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.profileSectionAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function OrderPreviewRow({ order, status, onPress }: { order: Order; status: string; onPress: () => void }) {
  return (
    <Pressable style={styles.orderPreviewRow} onPress={onPress}>
      <View style={styles.orderIcon}>
        <ClipboardList size={17} color={colors.info} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.orderPreviewTitle}>{order.id}</Text>
        <Text style={styles.orderPreviewMeta}>
          {new Date(order.createdAt).toLocaleDateString('tr-TR')} · {order.items.length} ürün · {formatPrice(order.total)}
        </Text>
      </View>
      <View style={styles.buyerStatusPill}>
        <Text style={styles.buyerStatusPillText}>{status}</Text>
      </View>
    </Pressable>
  );
}

function FavoritePreviewCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Pressable style={styles.favoritePreviewCard} onPress={onPress}>
      <Image source={{ uri: product.imageUrl }} style={styles.favoritePreviewImage} resizeMode="cover" />
      <Text style={styles.favoritePreviewTitle} numberOfLines={2}>
        {product.title}
      </Text>
      <Text style={styles.favoritePreviewMeta}>{formatPrice(product.price)}</Text>
    </Pressable>
  );
}

function PreferenceSummary({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <View style={styles.preferenceSummary}>
      <View style={styles.preferenceIcon}>{icon}</View>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Text style={styles.preferenceValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.preferenceDetail} numberOfLines={2}>
        {detail}
      </Text>
    </View>
  );
}

function EditableStyleProfile({
  draft,
  budgetText,
  onChangeDraft,
  onChangeBudget,
  onSave,
}: {
  draft: StyleProfile;
  budgetText: string;
  onChangeDraft: (profile: StyleProfile | ((current: StyleProfile) => StyleProfile)) => void;
  onChangeBudget: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.editProfileBlock}>
      <View style={styles.formRow}>
        <View style={styles.flex}>
          <Text style={styles.inputLabel}>Kategori</Text>
          <TextInput
            value={draft.audience}
            onChangeText={(audience) => onChangeDraft((current) => ({ ...current, audience }))}
            style={styles.input}
          />
        </View>
        <View style={styles.formSide}>
          <Text style={styles.inputLabel}>Beden</Text>
          <TextInput
            value={draft.size}
            onChangeText={(size) => onChangeDraft((current) => ({ ...current, size: size.toUpperCase() }))}
            style={styles.input}
          />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.flex}>
          <Text style={styles.inputLabel}>Yaş</Text>
          <TextInput
            value={draft.age ?? ''}
            onChangeText={(age) => onChangeDraft((current) => ({ ...current, age }))}
            style={styles.input}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.inputLabel}>Maksimum bütçe</Text>
          <TextInput value={budgetText} onChangeText={onChangeBudget} keyboardType="numeric" style={styles.input} />
        </View>
      </View>

      <Text style={styles.buyerSubheading}>Stil tercihleri</Text>
      <View style={styles.chipGrid}>
        {styleOptions.map((style) => (
          <Chip
            key={style}
            label={style}
            selected={draft.styles.includes(style)}
            onPress={() => onChangeDraft((current) => ({ ...current, styles: toggleArray(current.styles, style) }))}
          />
        ))}
      </View>

      <Text style={styles.buyerSubheading}>Kullanım amaçları</Text>
      <View style={styles.chipGrid}>
        {occasionOptions.map((occasion) => (
          <Chip
            key={occasion}
            label={occasion}
            selected={draft.occasions.includes(occasion)}
            onPress={() => onChangeDraft((current) => ({ ...current, occasions: toggleArray(current.occasions, occasion) }))}
          />
        ))}
      </View>

      <Text style={styles.buyerSubheading}>Renk tercihleri</Text>
      <View style={styles.chipGrid}>
        {colorOptions.map((color) => (
          <Chip
            key={color}
            label={color}
            selected={draft.colors.includes(color)}
            onPress={() => onChangeDraft((current) => ({ ...current, colors: toggleArray(current.colors, color) }))}
          />
        ))}
      </View>

      <ActionButton label="Stil profilini kaydet" icon={<Sparkles size={18} color={colors.surface} />} onPress={onSave} />
    </View>
  );
}

function SellerProfile({
  email,
  sellerProducts,
  sellerCreditAccount,
  generatedScore,
  generatedCount,
  publishedCount,
  sellerOrders,
  analyticsEvents,
  onOpenSellerPanel,
  onSignOut,
}: {
  email: string;
  sellerProducts: Product[];
  sellerCreditAccount?: SellerCreditAccount;
  generatedScore?: number;
  generatedCount: number;
  publishedCount: number;
  sellerOrders: SellerOrder[];
  analyticsEvents: AnalyticsEvent[];
  onOpenSellerPanel: () => void;
  onSignOut: () => void;
}) {
  const activeProducts = sellerProducts.filter((product) => (product.status ?? 'active') === 'active');
  const archivedProducts = sellerProducts.filter((product) => product.status === 'archived');
  const lowStockProducts = sellerProducts.filter((product) => product.stock <= 5);
  const lowVisibilityProducts = sellerProducts.filter((product) => product.visibilityScore < 80);
  const sellerProductIds = new Set(sellerProducts.map((product) => product.id));
  const averageVisibility =
    sellerProducts.length > 0
      ? Math.round(sellerProducts.reduce((total, product) => total + product.visibilityScore, 0) / sellerProducts.length)
      : generatedScore ?? 0;
  const detailViews = countSellerEvents(analyticsEvents, sellerProductIds, 'product_detail_opened');
  const tryOnEvents =
    countSellerEvents(analyticsEvents, sellerProductIds, 'try_on_opened') +
    countSellerEvents(analyticsEvents, sellerProductIds, 'try_on_preview_generated');
  const addToCartEvents = countSellerEvents(analyticsEvents, sellerProductIds, 'add_to_cart');
  const detailViewsByProduct = countEventsByProduct(analyticsEvents, sellerProductIds, 'product_detail_opened');
  const addToCartByProduct = countEventsByProduct(analyticsEvents, sellerProductIds, 'add_to_cart');
  const lowConversionProducts = activeProducts
    .map((product) => ({
      product,
      views: detailViewsByProduct.get(product.id) ?? 0,
      carts: addToCartByProduct.get(product.id) ?? 0,
    }))
    .filter((item) => item.views > 0 && item.carts === 0)
    .slice(0, 3);
  const topProducts = activeProducts
    .map((product) => ({
      product,
      carts: addToCartByProduct.get(product.id) ?? 0,
      views: detailViewsByProduct.get(product.id) ?? 0,
    }))
    .sort((a, b) => b.carts + b.views - (a.carts + a.views))
    .slice(0, 3);
  const orderTotal = sellerOrders.reduce((total, order) => total + order.total, 0);
  const pendingOrders = sellerOrders.filter((order) => order.status !== 'completed').length;
  const completedOrders = sellerOrders.filter((order) => order.status === 'completed').length;
  const newOrders = sellerOrders.filter((order) => order.status === 'new').length;
  const preparingOrders = sellerOrders.filter((order) => order.status === 'preparing').length;
  const returnQueue = sellerOrders.reduce((total, order) => total + (order.status === 'issue' ? 1 : 0), 0);
  const availableAICredits = sellerCreditAccount
    ? sellerCreditAccount.freeCredits + sellerCreditAccount.paidCredits
    : undefined;
  const creditDebtAmount = sellerCreditAccount?.creditDebtAmount ?? 0;

  return (
    <SellerScreenShell
      eyebrow="Satıcı merkezi"
      title="Panel"
      subtitle="Mağaza operasyonunu, sipariş akışını ve AI görünürlüğünü tek merkezden takip et."
      action={
        <Pressable style={styles.sellerLogoutButton} onPress={onSignOut}>
          <LogOut size={16} color={colors.inkStrong} />
        </Pressable>
      }
    >
      <SellerSection>
        <View style={styles.sellerAccountRow}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>S</Text>
          </View>
          <View style={styles.flex}>
            <SellerStatusPill label="Satıcı hesabı" tone="trust" />
            <Text style={styles.sellerEmail} numberOfLines={1}>{email}</Text>
            <Text style={styles.sellerMode}>Mağaza operasyon paneli</Text>
          </View>
        </View>
      </SellerSection>

      <View style={styles.sellerMetricGrid}>
        <SellerMetricTile icon={<CircleDollarSign size={15} color={colors.commerce} />} label="Toplam ciro" value={formatPrice(orderTotal)} tone="commerce" />
        <SellerMetricTile icon={<ReceiptText size={15} color={colors.warningStrong} />} label="Bekleyen" value={String(pendingOrders)} tone="warning" />
        <SellerMetricTile icon={<PackagePlus size={15} color={colors.trust} />} label="Aktif ürün" value={String(activeProducts.length)} tone="trust" />
        <SellerMetricTile icon={<BarChart3 size={15} color={colors.ai} />} label="AI görünürlük" value={averageVisibility ? `${averageVisibility}/100` : '-'} tone="ai" />
        <SellerMetricTile icon={<WandSparkles size={15} color={colors.reward} />} label="AI kredisi" value={typeof availableAICredits === 'number' ? `${availableAICredits}` : '-'} tone="reward" />
        <SellerMetricTile icon={<CircleDollarSign size={15} color={colors.danger} />} label="Kredi borcu" value={formatPrice(creditDebtAmount)} tone="danger" />
      </View>

      <SellerSection title="Bugünkü öncelikler" subtitle="Satışa ve görünürlüğe doğrudan etki eden kısa iş listesi.">
        <SellerInsightRow
          icon={<ReceiptText size={16} color={colors.info} />}
          title={`${newOrders + preparingOrders} sipariş aksiyon bekliyor`}
          body={`${newOrders} yeni, ${preparingOrders} hazırlanıyor durumunda.`}
          tone="info"
        />
        <SellerInsightRow
          icon={<AlertCircle size={16} color={colors.warningStrong} />}
          title={`${lowStockProducts.length} üründe stok kritik`}
          body="Stok güncellemek önerilerden düşme riskini azaltır."
          tone="warning"
        />
        <SellerInsightRow
          icon={<Sparkles size={16} color={colors.ai} />}
          title={`${lowVisibilityProducts.length} ürünün AI skoru düşük`}
          body="Açıklama, tag ve search intent alanlarını AI ile iyileştir."
          tone="ai"
        />
        <SellerInsightRow
          icon={<Archive size={16} color={colors.danger} />}
          title={`${returnQueue} sorunlu sipariş sinyali`}
          body="İade ve sorunlu siparişleri Siparişler ekranından yönet."
          tone={returnQueue > 0 ? 'danger' : 'neutral'}
        />
      </SellerSection>

      <SellerSection title="Hızlı aksiyonlar">
        <View style={styles.sellerQuickGrid}>
          <SellerQuickAction icon={<WandSparkles size={17} color={colors.ai} />} label="AI ile ürün ekle" onPress={onOpenSellerPanel} />
          <SellerQuickAction icon={<PackagePlus size={17} color={colors.ai} />} label="Ürünleri yönet" onPress={() => router.push('/seller-products')} />
          <SellerQuickAction icon={<ReceiptText size={17} color={colors.warningStrong} />} label="Siparişleri aç" onPress={() => router.push('/seller-orders')} />
          <SellerQuickAction icon={<Store size={17} color={colors.trust} />} label="Mağazayı düzenle" onPress={() => router.push('/seller-store')} />
        </View>
      </SellerSection>

      <SellerSection title="Performans özeti" subtitle="Bu cihazdaki event log üzerinden hesaplanır.">
        <View style={styles.sellerMetricGrid}>
          <SellerMetricTile icon={<Eye size={15} color={colors.info} />} label="Detay" value={String(detailViews)} tone="info" />
          <SellerMetricTile icon={<Sparkles size={15} color={colors.ai} />} label="Try-on" value={String(tryOnEvents)} tone="ai" />
          <SellerMetricTile icon={<ShoppingBag size={15} color={colors.commerce} />} label="Sepet" value={String(addToCartEvents)} tone="commerce" />
          <SellerMetricTile icon={<TrendingUp size={15} color={colors.warningStrong} />} label="Tamamlanan" value={String(completedOrders)} tone="warning" />
        </View>
      </SellerSection>

      <SellerSection title="İçgörüler" subtitle="Ürünlerin hangi noktada aksiyon istediğini özetler.">
        <SellerInsightRow
          icon={<Archive size={16} color={colors.danger} />}
          title={`${archivedProducts.length} ürün arşivde`}
          body="Arşiv ürünler Keşfet ve Chat önerilerinde görünmez."
          tone="danger"
        />
        <SellerInsightRow
          icon={<PackageCheck size={16} color={colors.trust} />}
          title={`${publishedCount} ürün yayınlama event'i`}
          body={`${generatedCount} AI listing üretildi.`}
          tone="trust"
        />
        <SellerInsightRow
          icon={<Eye size={16} color={colors.ai} />}
          title={`${lowConversionProducts.length} ürün görüntülenip sepete eklenmedi`}
          body={lowConversionProducts.length > 0 ? lowConversionProducts.map((item) => item.product.title).join(', ') : 'Şu an düşük dönüşüm sinyali görünmüyor.'}
          tone="ai"
        />
        <SellerInsightRow
          icon={<TrendingUp size={16} color={colors.commerce} />}
          title="En çok sinyal alan ürünler"
          body={topProducts.length > 0 ? topProducts.map((item) => `${item.product.title} (${item.views}/${item.carts})`).join(' · ') : 'Ürün bazlı event oluştuğunda burada sıralanacak.'}
          tone="commerce"
        />
      </SellerSection>
    </SellerScreenShell>
  );
}

function SellerQuickAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      {icon}
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function SellerInsightRow({
  icon,
  title,
  body,
  tone = 'neutral',
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone?: 'neutral' | 'brand' | 'commerce' | 'ai' | 'trust' | 'info' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View style={styles.sellerInsightRow}>
      <View style={[
        styles.sellerInsightIcon,
        tone === 'brand' && styles.sellerInsightBrand,
        tone === 'commerce' && styles.sellerInsightCommerce,
        tone === 'ai' && styles.sellerInsightAi,
        tone === 'trust' && styles.sellerInsightTrust,
        tone === 'info' && styles.sellerInsightInfo,
        tone === 'success' && styles.sellerInsightSuccess,
        tone === 'warning' && styles.sellerInsightWarning,
        tone === 'danger' && styles.sellerInsightDanger,
      ]}>
        {icon}
      </View>
      <View style={styles.flex}>
        <Text style={styles.sellerInsightTitle}>{title}</Text>
        <Text style={styles.sellerInsightBody}>{body}</Text>
      </View>
    </View>
  );
}

function InsightRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.accountMeta}>{body}</Text>
      </View>
    </View>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      {icon}
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SecondaryButton({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      {icon}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function InfoLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.infoLabel}>
      {icon}
      <Text style={styles.infoLabelText}>{label}</Text>
    </View>
  );
}

function countSellerEvents(events: AnalyticsEvent[], productIds: Set<string>, eventName: AnalyticsEvent['name']) {
  return events.filter((event) => event.name === eventName && isSellerProductEvent(event, productIds)).length;
}

function countEventsByProduct(events: AnalyticsEvent[], productIds: Set<string>, eventName: AnalyticsEvent['name']) {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    if (event.name !== eventName) return;
    const productId = typeof event.metadata?.productId === 'string' ? event.metadata.productId : undefined;
    if (!productId || !productIds.has(productId)) return;
    counts.set(productId, (counts.get(productId) ?? 0) + 1);
  });
  return counts;
}

function isSellerProductEvent(event: AnalyticsEvent, productIds: Set<string>) {
  const productId = typeof event.metadata?.productId === 'string' ? event.metadata.productId : undefined;
  return productId ? productIds.has(productId) : false;
}

function buyerStatusLabel(statuses: string[]) {
  if (statuses.length === 0) return 'Bekleniyor';
  if (statuses.includes('issue')) return 'Sorunlu';
  if (statuses.every((status) => status === 'completed')) return 'Tamamlandı';
  if (statuses.includes('shipped')) return 'Kargoda';
  if (statuses.includes('preparing')) return 'Hazırlanıyor';
  return 'Yeni';
}

function toggleArray<T extends string>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function getInitials(email?: string) {
  if (!email) return 'C2';
  const name = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, ' ') ?? '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return initials || 'C2';
}

function paymentMethodShortLabel(paymentMethod: SavedPaymentMethod) {
  if (paymentMethod.type === 'cash') return 'Kapıda ödeme';
  if (paymentMethod.type === 'wallet') return paymentMethod.label;
  return `${paymentMethod.brand} •••• ${paymentMethod.last4}`;
}

const styles = StyleSheet.create({
  buyerSafe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  buyerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
  },
  profileHeader: {
    minHeight: 168,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  profileAvatar: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: colors.info,
    fontSize: 20,
    fontWeight: '900',
  },
  profileHeaderBody: {
    flex: 1,
    gap: 6,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profileTitle: {
    color: colors.inkStrong,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
  },
  profileEmail: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileStatText: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  profileStatDot: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  profileLogout: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    gap: 8,
  },
  quickTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileLabel: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  quickTileValue: {
    color: colors.mutedSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  quickTileArrow: {
    position: 'absolute',
    right: 14,
    top: 16,
  },
  settingsSection: {
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  settingsHeader: {
    gap: 4,
  },
  settingsTitle: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  settingsSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  settingsList: {
    gap: 8,
  },
  settingsRow: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  settingsRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  settingsRowTitleDanger: {
    color: colors.danger,
  },
  settingsRowSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  profileSection: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    gap: 13,
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileSectionTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  profileSectionSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  profileSectionAction: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '900',
  },
  buyerStack: {
    gap: 10,
  },
  buyerEmptyText: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  orderPreviewRow: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderPreviewTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  orderPreviewMeta: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  buyerStatusPill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerStatusPillText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  favoritePreviewRail: {
    gap: 10,
    paddingRight: 4,
  },
  favoritePreviewCard: {
    width: 132,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  favoritePreviewImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
  },
  favoritePreviewTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingTop: 9,
  },
  favoritePreviewMeta: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 10,
  },
  buyerSubheading: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  recentChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    maxWidth: '100%',
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentChipText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  accountInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  preferenceSummary: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 118,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 5,
  },
  preferenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  preferenceValue: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  preferenceDetail: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  styleSummary: {
    gap: 12,
  },
  preferenceChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceChip: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceChipText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  editProfileBlock: {
    gap: 13,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formSide: {
    width: 86,
  },
  inputLabel: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  kicker: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  accountEmail: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  accountMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 86,
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    gap: 6,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 74,
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    gap: 7,
    justifyContent: 'center',
  },
  quickActionText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  segmentedNav: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.tile,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  sellerTab: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sellerTabActive: {
    backgroundColor: colors.surface,
  },
  sellerTabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  sellerTabTextActive: {
    color: colors.ink,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: colors.tile,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  productSummary: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  buyerOrderRow: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favoriteRow: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    gap: 3,
  },
  recentBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  productThumb: {
    width: 64,
    height: 78,
    borderRadius: 10,
    backgroundColor: colors.tile,
  },
  productTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderAction: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderActionText: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '900',
  },
  storePreview: {
    flexDirection: 'row',
    gap: 12,
  },
  storeLogo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.trustSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabelText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    color: colors.ink,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  sellerLogoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  sellerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.inkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
  },
  sellerEmail: {
    marginTop: 8,
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  sellerMode: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  sellerMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sellerQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sellerInsightRow: {
    flexDirection: 'row',
    gap: 11,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
  },
  sellerInsightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInsightBrand: {
    backgroundColor: colors.brandSoft,
  },
  sellerInsightCommerce: {
    backgroundColor: colors.commerceSoft,
  },
  sellerInsightAi: {
    backgroundColor: colors.aiSoft,
  },
  sellerInsightTrust: {
    backgroundColor: colors.trustSoft,
  },
  sellerInsightInfo: {
    backgroundColor: colors.infoSoft,
  },
  sellerInsightSuccess: {
    backgroundColor: colors.softGreen,
  },
  sellerInsightWarning: {
    backgroundColor: colors.warning,
  },
  sellerInsightDanger: {
    backgroundColor: colors.commerceSoft,
  },
  sellerInsightTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  sellerInsightBody: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 2,
  },
});
