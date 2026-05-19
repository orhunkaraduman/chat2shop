import * as ImagePicker from 'expo-image-picker';
import { Archive, Camera, Gift, ImagePlus, Loader2, Mail, Megaphone, Phone, Save, ShieldCheck, ShoppingBag, Star, Store, Truck } from 'lucide-react-native';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ReactNode, useState } from 'react';

import {
  SellerMetricTile,
  SellerProgressBar,
  SellerScreenShell,
  SellerSection,
  SellerStatusPill,
} from '@/components/seller/SellerUI';
import { uploadSellerBrandImage } from '@/services/firebaseUpload';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { SellerRewardCampaign, SellerRewardCampaignType } from '@/types';

type BrandUploadStatus = 'idle' | 'logo' | 'cover';
type CampaignDraft = {
  type: SellerRewardCampaignType;
  rewardCredits: string;
  budgetCredits: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  minOrderAmount: string;
  productIds: string;
  categoryFilter: string;
};

const campaignDefaults: Record<SellerRewardCampaignType, Omit<CampaignDraft, 'type'>> = {
  review_reward: {
    rewardCredits: '3',
    budgetCredits: '90',
    perUserLimit: '1',
    startsAt: '',
    endsAt: '',
    minOrderAmount: '',
    productIds: '',
    categoryFilter: '',
  },
  purchase_reward: {
    rewardCredits: '10',
    budgetCredits: '300',
    perUserLimit: '1',
    startsAt: '',
    endsAt: '',
    minOrderAmount: '500',
    productIds: '',
    categoryFilter: '',
  },
  fit_feedback_reward: {
    rewardCredits: '2',
    budgetCredits: '80',
    perUserLimit: '1',
    startsAt: '',
    endsAt: '',
    minOrderAmount: '',
    productIds: '',
    categoryFilter: '',
  },
  store_promo: {
    rewardCredits: '5',
    budgetCredits: '100',
    perUserLimit: '1',
    startsAt: '',
    endsAt: '',
    minOrderAmount: '',
    productIds: '',
    categoryFilter: '',
  },
  sponsored_try_on: {
    rewardCredits: '2',
    budgetCredits: '120',
    perUserLimit: '2',
    startsAt: '',
    endsAt: '',
    minOrderAmount: '',
    productIds: '',
    categoryFilter: '',
  },
};

const campaignTypeOptions: Array<{ type: SellerRewardCampaignType; label: string }> = [
  { type: 'review_reward', label: 'Yorum' },
  { type: 'fit_feedback_reward', label: 'Fit feedback' },
  { type: 'purchase_reward', label: 'Alışveriş' },
  { type: 'store_promo', label: 'Promosyon' },
  { type: 'sponsored_try_on', label: 'Kabin' },
];

export default function SellerStoreScreen() {
  const {
    canManageSeller,
    currentUser,
    sellerProducts,
    sellerRewardCampaigns,
    sellerStore,
    updateSellerStore,
    createSellerRewardCampaign,
    archiveSellerRewardCampaign,
  } = useAppState();
  const [brandUploadStatus, setBrandUploadStatus] = useState<BrandUploadStatus>('idle');
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>({
    type: 'review_reward',
    ...campaignDefaults.review_reward,
  });

  const averageVisibility =
    sellerProducts.length > 0
      ? Math.round(sellerProducts.reduce((total, product) => total + product.visibilityScore, 0) / sellerProducts.length)
      : 0;

  async function pickBrandImage(kind: Exclude<BrandUploadStatus, 'idle'>) {
    if (!canManageSeller || brandUploadStatus !== 'idle') return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Mağaza görseli yüklemek için galeri erişimine izin vermen gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.86,
    });

    if (result.canceled) return;

    try {
      setBrandUploadStatus(kind);
      const imageUrl = await uploadSellerBrandImage(result.assets[0].uri, currentUser?.id ?? sellerStore.sellerId, kind);
      updateSellerStore(kind === 'logo' ? { logoUrl: imageUrl } : { coverUrl: imageUrl });
    } catch (error) {
      Alert.alert('Görsel yüklenemedi', error instanceof Error ? error.message : 'Lütfen farklı bir görsel dene.');
    } finally {
      setBrandUploadStatus('idle');
    }
  }

  function updateCampaignDraft(patch: Partial<CampaignDraft>) {
    setCampaignDraft((current) => ({ ...current, ...patch }));
  }

  function selectCampaignType(type: SellerRewardCampaignType) {
    setCampaignDraft({ type, ...campaignDefaults[type] });
  }

  function createCustomCampaign() {
    const rewardCredits = Math.max(1, Number(campaignDraft.rewardCredits) || 0);
    const budgetCredits = Math.max(rewardCredits, Number(campaignDraft.budgetCredits) || rewardCredits);
    const perUserLimit = Math.max(1, Math.trunc(Number(campaignDraft.perUserLimit) || 1));
    const minOrderAmount = Number(campaignDraft.minOrderAmount);
    const productIds = splitList(campaignDraft.productIds);
    const categoryFilter = splitList(campaignDraft.categoryFilter) as SellerRewardCampaign['categoryFilter'];

    void createSellerRewardCampaign(campaignDraft.type, {
      rewardCredits,
      budgetCredits,
      perUserLimit,
      startsAt: normalizeOptionalDate(campaignDraft.startsAt),
      endsAt: normalizeOptionalDate(campaignDraft.endsAt),
      minOrderAmount: Number.isFinite(minOrderAmount) && minOrderAmount > 0 ? minOrderAmount : undefined,
      productIds: productIds.length > 0 ? productIds : undefined,
      categoryFilter: categoryFilter && categoryFilter.length > 0 ? categoryFilter : undefined,
    });
  }

  return (
    <SellerScreenShell
      eyebrow="Mağaza markalama"
      title="Mağaza"
      subtitle="Alıcıya güven veren mağaza bilgilerini, destek detaylarını ve public görünümü düzenle."
    >
      <View style={styles.previewCard}>
        <View style={styles.cover}>
          {sellerStore.coverUrl ? <Image source={{ uri: sellerStore.coverUrl }} style={styles.coverImage} resizeMode="cover" /> : null}
        </View>
        <View style={styles.previewBody}>
          <View style={styles.logoWrap}>
            {sellerStore.logoUrl ? (
              <Image source={{ uri: sellerStore.logoUrl }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>{sellerStore.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
              </View>
            )}
          </View>
          <View style={styles.storeCopy}>
            <Text style={styles.storeName}>{sellerStore.name}</Text>
            <Text style={styles.storeDescription} numberOfLines={3}>{sellerStore.description}</Text>
            <View style={styles.pillRow}>
              <SellerStatusPill label={`${sellerStore.rating.toFixed(1)} puan`} tone="warning" />
              <SellerStatusPill label={sellerStore.shippingTime} tone="info" />
              <SellerStatusPill label={`${averageVisibility || '-'} AI`} tone="ai" />
            </View>
            <SellerProgressBar value={averageVisibility} tone="ai" />
          </View>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <SellerMetricTile label="Mağaza puanı" value={sellerStore.rating.toFixed(1)} icon={<Star size={15} color={colors.warningStrong} />} tone="warning" />
        <SellerMetricTile label="Aktif ürün" value={String(sellerProducts.filter((product) => (product.status ?? 'active') === 'active').length)} icon={<Store size={15} color={colors.trust} />} tone="trust" />
        <SellerMetricTile label="Kargo" value={sellerStore.shippingTime} icon={<Truck size={15} color={colors.info} />} tone="info" />
        <SellerMetricTile label="AI ortalama" value={averageVisibility ? `${averageVisibility}/100` : '-'} icon={<ShieldCheck size={15} color={colors.ai} />} tone="ai" />
      </View>

      <SellerSection title="Mağaza kimliği" subtitle="Public mağaza sayfasında ilk görünen bilgiler.">
        <LabeledInput
          icon={<Store size={16} color={colors.trust} />}
          label="Mağaza adı"
          value={sellerStore.name}
          onChangeText={(name) => updateSellerStore({ name })}
        />
        <LabeledInput
          icon={<ShieldCheck size={16} color={colors.ai} />}
          label="Açıklama"
          value={sellerStore.description}
          onChangeText={(description) => updateSellerStore({ description })}
          multiline
        />
        <LabeledInput
          icon={<Phone size={16} color={colors.inkSoft} />}
          label="İletişim"
          value={sellerStore.contact}
          onChangeText={(contact) => updateSellerStore({ contact })}
        />
      </SellerSection>

      <SellerSection title="Marka görselleri" subtitle="Logo ve cover görsellerini mağaza sayfanda kullan.">
        <View style={styles.brandImageGrid}>
          <BrandImageCard
            kind="logo"
            title="Logo"
            subtitle="Mağaza adı yanında görünür."
            imageUrl={sellerStore.logoUrl}
            loading={brandUploadStatus === 'logo'}
            disabled={!canManageSeller || brandUploadStatus !== 'idle'}
            onPress={() => pickBrandImage('logo')}
          />
          <BrandImageCard
            kind="cover"
            title="Cover"
            subtitle="Public mağaza sayfasının üst alanı."
            imageUrl={sellerStore.coverUrl}
            loading={brandUploadStatus === 'cover'}
            disabled={!canManageSeller || brandUploadStatus !== 'idle'}
            onPress={() => pickBrandImage('cover')}
          />
        </View>
      </SellerSection>

      <SellerSection title="Jeton kampanyaları" subtitle="Alıcıların yorum, alışveriş ve promosyonlardan jeton kazanmasını sağla.">
        <View style={styles.campaignQuickGrid}>
          <CampaignQuickButton
            title="+3 yorum"
            subtitle="Yorum yapanlara"
            icon={<Star size={16} color={colors.warningStrong} />}
            onPress={() => void createSellerRewardCampaign('review_reward')}
          />
          <CampaignQuickButton
            title="+2 fit"
            subtitle="Beden paylaşana"
            icon={<ShieldCheck size={16} color={colors.ai} />}
            onPress={() => void createSellerRewardCampaign('fit_feedback_reward')}
          />
          <CampaignQuickButton
            title="+2 alışveriş"
            subtitle="Sipariş sonrası"
            icon={<ShoppingBag size={16} color={colors.commerce} />}
            onPress={() => void createSellerRewardCampaign('purchase_reward')}
          />
          <CampaignQuickButton
            title="+5 promosyon"
            subtitle="Jeton Merkezi"
            icon={<Gift size={16} color={colors.ai} />}
            onPress={() => void createSellerRewardCampaign('store_promo')}
          />
          <CampaignQuickButton
            title="Kabin"
            subtitle="Deneme sponsorla"
            icon={<Megaphone size={16} color={colors.tryOn} />}
            onPress={() => void createSellerRewardCampaign('sponsored_try_on')}
          />
        </View>
        <View style={styles.campaignBuilder}>
          <Text style={styles.campaignBuilderTitle}>Kampanyayı özelleştir</Text>
          <View style={styles.campaignTypeGrid}>
            {campaignTypeOptions.map((option) => (
              <Pressable
                key={option.type}
                style={[styles.campaignTypeChip, campaignDraft.type === option.type && styles.campaignTypeChipActive]}
                onPress={() => selectCampaignType(option.type)}
              >
                <Text style={[styles.campaignTypeText, campaignDraft.type === option.type && styles.campaignTypeTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.campaignFieldGrid}>
            <CompactInput label="Ödül" value={campaignDraft.rewardCredits} onChangeText={(rewardCredits) => updateCampaignDraft({ rewardCredits })} />
            <CompactInput label="Bütçe" value={campaignDraft.budgetCredits} onChangeText={(budgetCredits) => updateCampaignDraft({ budgetCredits })} />
            <CompactInput label="Limit" value={campaignDraft.perUserLimit} onChangeText={(perUserLimit) => updateCampaignDraft({ perUserLimit })} />
            <CompactInput label="Min. sepet" value={campaignDraft.minOrderAmount} onChangeText={(minOrderAmount) => updateCampaignDraft({ minOrderAmount })} />
          </View>
          <CompactInput
            label="Ürün ID filtresi"
            value={campaignDraft.productIds}
            onChangeText={(productIds) => updateCampaignDraft({ productIds })}
            placeholder="Virgülle ayır"
          />
          <CompactInput
            label="Kategori filtresi"
            value={campaignDraft.categoryFilter}
            onChangeText={(categoryFilter) => updateCampaignDraft({ categoryFilter })}
            placeholder="dress, jacket"
          />
          <View style={styles.campaignFieldGrid}>
            <CompactInput label="Başlangıç" value={campaignDraft.startsAt} onChangeText={(startsAt) => updateCampaignDraft({ startsAt })} placeholder="YYYY-MM-DD" />
            <CompactInput label="Bitiş" value={campaignDraft.endsAt} onChangeText={(endsAt) => updateCampaignDraft({ endsAt })} placeholder="YYYY-MM-DD" />
          </View>
          <Pressable style={styles.createCampaignButton} onPress={createCustomCampaign}>
            <Text style={styles.createCampaignText}>Kampanyayı oluştur</Text>
          </Pressable>
        </View>
        <View style={styles.campaignList}>
          {sellerRewardCampaigns.length > 0 ? (
            sellerRewardCampaigns.slice(0, 5).map((campaign) => (
              <View key={campaign.id} style={styles.campaignRow}>
                <View style={styles.campaignIcon}>
                  <Megaphone size={16} color={colors.reward} />
                </View>
                <View style={styles.campaignCopy}>
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  <Text style={styles.campaignMeta}>
                    {getCampaignTypeLabel(campaign.type)} · +{campaign.rewardCredits} jeton · kalan{' '}
                    {Math.max(0, campaign.budgetCredits - campaign.spentCredits)}/{campaign.budgetCredits}
                  </Text>
                  {campaign.productIds?.length || campaign.categoryFilter?.length || campaign.minOrderAmount ? (
                    <Text style={styles.campaignFilterMeta} numberOfLines={1}>
                      {[
                        campaign.minOrderAmount ? `min. ${campaign.minOrderAmount} TL` : undefined,
                        campaign.categoryFilter?.length ? `kategori: ${campaign.categoryFilter.join(', ')}` : undefined,
                        campaign.productIds?.length ? `${campaign.productIds.length} ürün` : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                </View>
                {campaign.status !== 'archived' ? (
                  <Pressable style={styles.archiveCampaignButton} onPress={() => void archiveSellerRewardCampaign(campaign.id)}>
                    <Text style={styles.archiveCampaignText}>Arşivle</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCampaignCard}>
              <Text style={styles.emptyCampaignTitle}>Henüz jeton kampanyan yok</Text>
              <Text style={styles.emptyCampaignText}>Yorum ödülü veya mağaza promosyonu açarak alıcıları etkileşime davet et.</Text>
            </View>
          )}
        </View>
      </SellerSection>

      <SellerSection title="Güven ve destek" subtitle="Ürün detayında ve mağaza sayfasında güven sinyali olarak gösterilir.">
        <LabeledInput
          icon={<Mail size={16} color={colors.info} />}
          label="Support e-posta"
          value={sellerStore.supportEmail ?? ''}
          onChangeText={(supportEmail) => updateSellerStore({ supportEmail })}
        />
        <LabeledInput
          icon={<Phone size={16} color={colors.ai} />}
          label="Support telefon"
          value={sellerStore.supportPhone ?? ''}
          onChangeText={(supportPhone) => updateSellerStore({ supportPhone })}
        />
        <LabeledInput
          icon={<Truck size={16} color={colors.ai} />}
          label="Kargo süresi"
          value={sellerStore.shippingTime}
          onChangeText={(shippingTime) => updateSellerStore({ shippingTime })}
        />
        <LabeledInput
          icon={<Archive size={16} color={colors.danger} />}
          label="İade politikası"
          value={sellerStore.returnPolicy}
          onChangeText={(returnPolicy) => updateSellerStore({ returnPolicy })}
        />
        <LabeledInput
          icon={<Star size={16} color={colors.warningStrong} />}
          label="SSS / Güven notu"
          value={sellerStore.faq ?? ''}
          onChangeText={(faq) => updateSellerStore({ faq })}
          multiline
        />
        <Pressable style={styles.saveButton} onPress={() => updateSellerStore({})}>
          <Save size={16} color={colors.surface} />
          <Text style={styles.saveText}>Mağaza bilgilerini kaydet</Text>
        </Pressable>
      </SellerSection>
    </SellerScreenShell>
  );
}

function BrandImageCard({
  kind,
  title,
  subtitle,
  imageUrl,
  loading,
  disabled,
  onPress,
}: {
  kind: 'logo' | 'cover';
  title: string;
  subtitle: string;
  imageUrl?: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const isLogo = kind === 'logo';

  return (
    <View style={[styles.brandImageCard, isLogo ? styles.logoBrandCard : styles.coverBrandCard]}>
      <View style={[styles.brandPreview, isLogo ? styles.brandLogoPreview : styles.brandCoverPreview]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.brandPreviewImage} resizeMode="cover" />
        ) : (
          <View style={styles.brandPlaceholder}>
            <Camera size={isLogo ? 22 : 26} color={colors.mutedSoft} />
          </View>
        )}
        {loading ? (
          <View style={styles.uploadOverlay}>
            <Loader2 size={22} color={colors.surface} />
            <Text style={styles.uploadOverlayText}>Yükleniyor</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.brandCardBody}>
        <View style={styles.brandCardCopy}>
          <Text style={styles.brandCardTitle}>{title}</Text>
          <Text style={styles.brandCardSubtitle}>{subtitle}</Text>
        </View>
        <Pressable
          style={[styles.brandUploadButton, disabled && styles.brandUploadButtonDisabled]}
          onPress={onPress}
          disabled={disabled}
        >
          <ImagePlus size={15} color={disabled ? colors.mutedSoft : colors.inkStrong} />
          <Text style={[styles.brandUploadText, disabled && styles.brandUploadTextDisabled]}>
            {isLogo ? 'Logo yükle' : 'Cover yükle'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CampaignQuickButton({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.campaignQuickButton} onPress={onPress}>
      <View style={styles.campaignQuickIcon}>{icon}</View>
      <Text style={styles.campaignQuickTitle}>{title}</Text>
      <Text style={styles.campaignQuickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function CompactInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.compactInputGroup}>
      <Text style={styles.compactInputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedSoft}
        style={styles.compactInput}
      />
    </View>
  );
}

function LabeledInput({
  icon,
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        placeholderTextColor={colors.mutedSoft}
      />
    </View>
  );
}

function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionalDate(value: string) {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function getCampaignTypeLabel(type: SellerRewardCampaignType) {
  switch (type) {
    case 'purchase_reward':
      return 'Alışveriş';
    case 'review_reward':
      return 'Yorum';
    case 'fit_feedback_reward':
      return 'Fit feedback';
    case 'store_promo':
      return 'Promosyon';
    case 'sponsored_try_on':
      return 'Sponsorlu Kabin';
    default:
      return 'Kampanya';
  }
}

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: {
    height: 96,
    backgroundColor: colors.trustSoft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  previewBody: {
    padding: 15,
    flexDirection: 'row',
    gap: 13,
  },
  logoWrap: {
    marginTop: -40,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.inkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
  },
  storeCopy: {
    flex: 1,
    gap: 8,
  },
  storeName: {
    color: colors.inkStrong,
    fontSize: 20,
    fontWeight: '900',
  },
  storeDescription: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandImageGrid: {
    gap: 12,
  },
  brandImageCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 12,
  },
  logoBrandCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverBrandCard: {
    gap: 12,
  },
  brandPreview: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandLogoPreview: {
    width: 86,
    height: 86,
    borderRadius: 26,
  },
  brandCoverPreview: {
    width: '100%',
    height: 122,
    borderRadius: 18,
  },
  brandPreviewImage: {
    width: '100%',
    height: '100%',
  },
  brandPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 33, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadOverlayText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  brandCardBody: {
    flex: 1,
    gap: 12,
  },
  brandCardCopy: {
    gap: 4,
  },
  brandCardTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: '900',
  },
  brandCardSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  brandUploadButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandUploadButtonDisabled: {
    opacity: 0.55,
  },
  brandUploadText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  brandUploadTextDisabled: {
    color: colors.mutedSoft,
  },
  campaignQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  campaignQuickButton: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 108,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
  },
  campaignQuickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  campaignQuickTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  campaignQuickSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  campaignBuilder: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 12,
  },
  campaignBuilderTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  campaignTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  campaignTypeChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignTypeChipActive: {
    borderColor: colors.reward,
    backgroundColor: colors.rewardSoft,
  },
  campaignTypeText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  campaignTypeTextActive: {
    color: colors.reward,
  },
  campaignFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactInputGroup: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 6,
  },
  compactInputLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  compactInput: {
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  createCampaignButton: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.inkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCampaignText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  campaignList: {
    gap: 10,
  },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
  },
  campaignIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  campaignCopy: {
    flex: 1,
  },
  campaignTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  campaignMeta: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  campaignFilterMeta: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  archiveCampaignButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  archiveCampaignText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCampaignCard: {
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
  },
  emptyCampaignTitle: {
    color: colors.inkStrong,
    fontWeight: '900',
    fontSize: 14,
  },
  emptyCampaignText: {
    color: colors.mutedSoft,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  inputGroup: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  inputLabel: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    color: colors.inkStrong,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.trust,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
});
