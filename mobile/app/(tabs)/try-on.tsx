import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Camera, Check, Coins, Download, ImagePlus, Images, MessageCircle, Share2, ShoppingBag, WandSparkles, X } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { Chip } from '@/components/Chip';
import { ScrollScreen } from '@/components/Screen';
import { getTryOnFrameGuidance, getTryOnFrameLabel, getTryOnFrameMode } from '@/services/tryOn';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { CartItem, Product, TryOnEnvironment, TryOnPreview } from '@/types';

type ProductSource = 'cart' | 'favorites';
type HistoryActionStatus = 'idle' | 'downloading' | 'sharing';

const ENVIRONMENT_OPTIONS: Array<{ id: TryOnEnvironment; label: string }> = [
  { id: 'outdoor', label: 'Dışarıda' },
  { id: 'home', label: 'Evde' },
  { id: 'party', label: 'Partide' },
  { id: 'office', label: 'Ofiste' },
  { id: 'holiday', label: 'Tatilde' },
];
export default function TryOnScreen() {
  const {
    selectedProduct,
    catalog,
    profile,
    cartItems,
    favoriteProductIds,
    tryOnState,
    tryOnGenerationStatus,
    tryOnGenerationError,
    tryOnHistory,
    addToCart,
    selectProduct,
    submitChatPrompt,
    updateTryOnState,
    generateTryOnPreview,
    recordTryOnToCheckout,
    buyerCreditAccount,
    buyerCreditLoading,
    tryOnCreditCost,
    refreshBuyerCreditCenter,
    getSponsoredTryOnTaskForProduct,
  } = useAppState();
  const [productSource, setProductSource] = useState<ProductSource>('cart');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryPreview, setActiveHistoryPreview] = useState<TryOnPreview | undefined>();
  const [historyActionStatus, setHistoryActionStatus] = useState<HistoryActionStatus>('idle');

  const activeCatalog = catalog.filter((product) => product.status !== 'archived');
  const cartProducts = useMemo(
    () => getProductsFromCart(cartItems, activeCatalog),
    [activeCatalog, cartItems],
  );
  const favoriteProducts = useMemo(
    () => getProductsByIds(favoriteProductIds, activeCatalog),
    [activeCatalog, favoriteProductIds],
  );
  const visibleProducts = productSource === 'cart' ? cartProducts : favoriteProducts;
  const latestHistoryPreview = tryOnHistory[0];
  const hasUserPhoto = tryOnState.mode === 'photo' && Boolean(tryOnState.photoUri);
  const buyerCreditBalance = buyerCreditAccount
    ? buyerCreditAccount.freeCredits + buyerCreditAccount.paidCredits
    : undefined;
  const sponsoredTryOnTask = getSponsoredTryOnTaskForProduct(selectedProduct.id);
  const isTryOnSponsored = Boolean(sponsoredTryOnTask);
  const hasEnoughBuyerCredits = isTryOnSponsored || typeof buyerCreditBalance !== 'number' || buyerCreditBalance >= tryOnCreditCost;
  const frameMode = useMemo(() => getTryOnFrameMode(selectedProduct), [selectedProduct]);
  const frameGuidance = getTryOnFrameGuidance(frameMode);

  useEffect(() => {
    void refreshBuyerCreditCenter();
  }, []);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.82,
    });

    if (!result.canceled) {
      updateTryOnState({ mode: 'photo', photoUri: result.assets[0].uri });
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.82,
    });

    if (!result.canceled) {
      updateTryOnState({ mode: 'photo', photoUri: result.assets[0].uri });
    }
  }

  function applyProductSelection(product: Product) {
    const nextSize = product.sizes.includes(profile.size) ? profile.size : product.sizes[0] ?? profile.size;
    selectProduct(product.id);
    updateTryOnState({
      mode: tryOnState.mode === 'photo' ? 'photo' : 'avatar',
      selectedSize: nextSize,
      selectedColor: product.color,
    });
  }

  function closeHistoryModal() {
    setIsHistoryOpen(false);
    setActiveHistoryPreview(undefined);
  }

  function openHistoryModal() {
    setActiveHistoryPreview(undefined);
    setIsHistoryOpen(true);
  }

  function addPreviewToCart(preview: TryOnPreview) {
    addToCart(preview.productId, preview.selectedSize, {
      source: 'try-on-history',
      productId: preview.productId,
    });
    selectProduct(preview.productId);
    recordTryOnToCheckout();
    closeHistoryModal();
    router.push('/checkout');
  }

  function askChatForPreview(preview: TryOnPreview) {
    submitChatPrompt(`${preview.productTitle} ürününü benim için kombinle.`);
    selectProduct(preview.productId);
    closeHistoryModal();
    router.push('/chat');
  }

  async function downloadPreview(preview: TryOnPreview) {
    setHistoryActionStatus('downloading');
    try {
      if (Platform.OS === 'web') {
        await downloadImageOnWeb(preview.previewImageUri, getTryOnFileName(preview));
        return;
      }

      const localUri = await getLocalTryOnImageUri(preview);
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert('İzin gerekli', 'Deneme görselini kaydetmek için galeri erişimine izin vermen gerekiyor.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Kaydedildi', 'Deneme görseli galerine kaydedildi.');
    } catch {
      Alert.alert('Görsel indirilemedi', 'Bu deneme görselinin süresi dolmuş olabilir. Yeni deneme oluşturup tekrar dene.');
    } finally {
      setHistoryActionStatus('idle');
    }
  }

  async function sharePreview(preview: TryOnPreview) {
    setHistoryActionStatus('sharing');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Paylaşım kullanılamıyor', 'Bu cihazda paylaşım arayüzü açılamıyor.');
        return;
      }

      const shareUri = Platform.OS === 'web' ? preview.previewImageUri : await getLocalTryOnImageUri(preview);
      await Sharing.shareAsync(shareUri, {
        dialogTitle: 'Chat2Shop Kabin denemesi',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch {
      Alert.alert('Görsel paylaşılamadı', 'Bu deneme görselinin süresi dolmuş olabilir. Yeni deneme oluşturup tekrar dene.');
    } finally {
      setHistoryActionStatus('idle');
    }
  }

  return (
    <ScrollScreen includeBottomInset={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Kabin</Text>
            <Text style={styles.subtitle}>Fotoğraf, ürün ve ortamı seç. Gerisini Chat2Shop hazırlasın.</Text>
          </View>
          <Pressable style={styles.creditPill} onPress={() => router.push('/buyer-credits')}>
            <Coins size={16} color={colors.reward} />
            <Text style={styles.creditText}>
              {buyerCreditLoading ? '...' : `${buyerCreditBalance ?? 10} jeton`}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.studioCard}>
        <View style={styles.studioPreviewWrap}>
          {hasUserPhoto && tryOnState.photoUri ? (
            <Image source={{ uri: tryOnState.photoUri }} style={styles.studioPreview} resizeMode="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <View style={styles.avatarHalo} />
              <View style={styles.avatarFigure}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.studioContent}>
          <Text style={styles.studioTitle}>Deneme fotoğrafı</Text>
          <Text style={styles.studioText}>{frameGuidance}</Text>
          <View style={styles.studioActions}>
            <Pressable style={styles.photoAction} onPress={pickPhoto}>
              <ImagePlus size={16} color={colors.inkStrong} />
              <Text style={styles.photoActionText}>Yükle</Text>
            </Pressable>
            <Pressable style={styles.photoAction} onPress={takePhoto}>
              <Camera size={16} color={colors.inkStrong} />
              <Text style={styles.photoActionText}>Çek</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {tryOnHistory.length > 0 && latestHistoryPreview ? (
        <RecentTryOnButton preview={latestHistoryPreview} count={tryOnHistory.length} onPress={openHistoryModal} />
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Ürün</Text>
            <Text style={styles.sectionSubtitle}>Denemek istediğin parçayı seç</Text>
          </View>
          <View style={styles.segment}>
            <SegmentButton label="Sepet" active={productSource === 'cart'} onPress={() => setProductSource('cart')} />
            <SegmentButton label="Favoriler" active={productSource === 'favorites'} onPress={() => setProductSource('favorites')} />
          </View>
        </View>

        {visibleProducts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {visibleProducts.map((product) => (
              <ProductChoiceCard
                key={product.id}
                product={product}
                selected={product.id === selectedProduct.id}
                onPress={() => applyProductSelection(product)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRail}>
            <Text style={styles.emptyRailText}>
              {productSource === 'cart'
                ? 'Sepetinde denenecek ürün yok.'
                : 'Favorilerine eklediğin ürünler burada görünür.'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Stil ayarı</Text>
          <Text style={styles.settingsText}>{selectedProduct.title}</Text>
        </View>

        <View style={styles.controlBlock}>
          <Text style={styles.controlTitle}>Ortam</Text>
          <View style={styles.optionRow}>
            {ENVIRONMENT_OPTIONS.map((environment) => (
              <Chip
                key={environment.id}
                label={environment.label}
                selected={tryOnState.environment === environment.id}
                onPress={() => updateTryOnState({ environment: environment.id })}
              />
            ))}
          </View>
        </View>

        <View style={styles.frameHint}>
          <Text style={styles.frameHintLabel}>Kadraj</Text>
          <View style={styles.frameHintCopy}>
            <Text style={styles.frameHintTitle}>{getTryOnFrameLabel(frameMode)}</Text>
            <Text style={styles.frameHintText}>{frameGuidance}</Text>
          </View>
        </View>

        {tryOnGenerationStatus === 'loading' ? <TryOnProcessingCard /> : null}
        {tryOnGenerationError ? <Text style={styles.error}>{tryOnGenerationError}</Text> : null}

        <ActionButton
          label={
            tryOnGenerationStatus === 'loading'
              ? 'AI önizleme oluşturuluyor...'
              : isTryOnSponsored
                ? 'Üstümde dene · Mağaza karşılıyor'
              : `Üstümde dene · ${tryOnCreditCost} jeton`
          }
          icon={<WandSparkles size={16} color={colors.surface} />}
          tone="tryOn"
          onPress={generateTryOnPreview}
          disabled={tryOnGenerationStatus === 'loading' || !hasEnoughBuyerCredits}
        />
      </View>

      <TryOnHistoryModal
        visible={isHistoryOpen}
        previews={tryOnHistory}
        activePreview={activeHistoryPreview}
        actionStatus={historyActionStatus}
        onClose={closeHistoryModal}
        onOpenPreview={setActiveHistoryPreview}
        onBackToGrid={() => setActiveHistoryPreview(undefined)}
        onDownload={downloadPreview}
        onShare={sharePreview}
        onAddToCart={addPreviewToCart}
        onAskChat={askChatForPreview}
      />
    </ScrollScreen>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RecentTryOnButton({ preview, count, onPress }: { preview: TryOnPreview; count: number; onPress: () => void }) {
  return (
    <Pressable style={styles.recentButton} onPress={onPress}>
      <Image source={{ uri: preview.previewImageUri }} style={styles.recentThumbnail} resizeMode="cover" />
      <View style={styles.recentCopy}>
        <Text style={styles.recentEyebrow}>Son denemeler</Text>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {count} görsel hazır
        </Text>
        <Text style={styles.recentText} numberOfLines={1}>
          Görüntüle, indir, paylaş veya sepete ekle
        </Text>
      </View>
      <View style={styles.recentIconBox}>
        <Images size={18} color={colors.tryOn} />
      </View>
    </Pressable>
  );
}

function TryOnHistoryModal({
  visible,
  previews,
  activePreview,
  actionStatus,
  onClose,
  onOpenPreview,
  onBackToGrid,
  onDownload,
  onShare,
  onAddToCart,
  onAskChat,
}: {
  visible: boolean;
  previews: TryOnPreview[];
  activePreview?: TryOnPreview;
  actionStatus: HistoryActionStatus;
  onClose: () => void;
  onOpenPreview: (preview: TryOnPreview) => void;
  onBackToGrid: () => void;
  onDownload: (preview: TryOnPreview) => void;
  onShare: (preview: TryOnPreview) => void;
  onAddToCart: (preview: TryOnPreview) => void;
  onAskChat: (preview: TryOnPreview) => void;
}) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'web' ? 54 : 24) + 12;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.historyModalSafe} edges={['left', 'right', 'bottom']}>
        <View style={[styles.historyModalHeader, { paddingTop: headerTopPadding }, activePreview && styles.historyModalHeaderDetail]}>
          {activePreview ? (
            <Pressable style={styles.modalCircleButton} hitSlop={12} onPress={onBackToGrid}>
              <ArrowLeft size={20} color={colors.inkStrong} />
            </Pressable>
          ) : (
            <View style={styles.modalCirclePlaceholder} />
          )}
          {activePreview ? (
            <View style={styles.historyModalSpacer} />
          ) : (
            <View style={styles.historyModalTitleWrap}>
              <Text style={styles.historyModalTitle}>Son denemeler</Text>
              <Text style={styles.historyModalSubtitle}>{previews.length} kabin görseli</Text>
            </View>
          )}
          <Pressable style={styles.modalCircleButton} hitSlop={12} onPress={onClose}>
            <X size={20} color={colors.inkStrong} />
          </Pressable>
        </View>

        {activePreview ? (
          <TryOnPreviewDetail
            preview={activePreview}
            actionStatus={actionStatus}
            onDownload={() => onDownload(activePreview)}
            onShare={() => onShare(activePreview)}
            onAddToCart={() => onAddToCart(activePreview)}
            onAskChat={() => onAskChat(activePreview)}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.historyModalGrid} showsVerticalScrollIndicator={false}>
            {previews.map((preview) => (
              <HistoryCard key={preview.id} preview={preview} onPress={() => onOpenPreview(preview)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function TryOnPreviewDetail({
  preview,
  actionStatus,
  onDownload,
  onShare,
  onAddToCart,
  onAskChat,
}: {
  preview: TryOnPreview;
  actionStatus: HistoryActionStatus;
  onDownload: () => void;
  onShare: () => void;
  onAddToCart: () => void;
  onAskChat: () => void;
}) {
  return (
    <View style={styles.previewDetail}>
      <View style={styles.previewDetailImageWrap}>
        <Image source={{ uri: preview.previewImageUri }} style={styles.previewDetailImage} resizeMode="contain" />
      </View>

      <View style={styles.previewDetailInfo}>
        <Text style={styles.previewDetailEyebrow}>Kabin sonucu</Text>
        <Text style={styles.previewDetailTitle}>{preview.productTitle}</Text>
        <Text style={styles.previewDetailText}>
          {preview.selectedColor} · {environmentLabel(preview.environment)} · {formatHistoryDate(preview.generatedAt)}
        </Text>
      </View>

      <View style={styles.previewDetailActions}>
        <ModalActionButton
          label="İndir"
          icon={<Download size={17} color={colors.inkStrong} />}
          onPress={onDownload}
          loading={actionStatus === 'downloading'}
        />
        <ModalActionButton
          label="Paylaş"
          icon={<Share2 size={17} color={colors.inkStrong} />}
          onPress={onShare}
          loading={actionStatus === 'sharing'}
        />
        <ModalActionButton
          label="Sepete ekle"
          icon={<ShoppingBag size={17} color={colors.surface} />}
          onPress={onAddToCart}
          primary
        />
        <ModalActionButton
          label="Chat'te kombin iste"
          icon={<MessageCircle size={17} color={colors.surface} />}
          onPress={onAskChat}
          primary
        />
      </View>
    </View>
  );
}

function ModalActionButton({
  label,
  icon,
  onPress,
  primary = false,
  loading = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  primary?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.modalActionButton, primary && styles.modalActionButtonPrimary, loading && styles.modalActionButtonDisabled]}
      onPress={loading ? undefined : onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator size="small" color={primary ? colors.surface : colors.inkStrong} /> : icon}
      <Text style={[styles.modalActionText, primary && styles.modalActionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function TryOnProcessingCard() {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1250,
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [sweep]);

  return (
    <View style={styles.processingCard}>
      <View style={styles.processingIcon}>
        <WandSparkles size={17} color={colors.tryOn} />
      </View>
      <View style={styles.processingCopy}>
        <Text style={styles.processingTitle}>AI önizleme oluşturuluyor</Text>
        <Text style={styles.processingText}>Fotoğraf ve ürün eşleştiriliyor. Bu işlem 20-60 sn sürebilir.</Text>
      </View>
      <Animated.View
        style={[
          styles.processingSweep,
          {
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-90, 260],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

function HistoryCard({
  preview,
  onPress,
}: {
  preview: TryOnPreview;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.historyCard} onPress={onPress}>
      <Image source={{ uri: preview.previewImageUri }} style={styles.historyImage} resizeMode="cover" />
      <Text style={styles.historyTitle} numberOfLines={2}>
        {preview.productTitle}
      </Text>
      <Text style={styles.historyMeta}>{formatHistoryDate(preview.generatedAt)}</Text>
    </Pressable>
  );
}

function ProductChoiceCard({
  product,
  selected,
  onPress,
}: {
  product: Product;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.productCard, selected && styles.productCardSelected]} onPress={onPress}>
      <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
      {selected ? (
        <View style={styles.selectedCheck}>
          <Check size={13} color={colors.surface} />
        </View>
      ) : null}
      <View style={styles.productText}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.productMeta}>
          {formatPrice(product.price)} · {product.color}
        </Text>
      </View>
    </Pressable>
  );
}

function getProductsFromCart(cartItems: CartItem[], catalog: Product[]) {
  return getProductsByIds(cartItems.map((item) => item.productId), catalog);
}

function getProductsByIds(ids: string[], catalog: Product[]) {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const products: Product[] = [];

  ids.forEach((id) => {
    if (seen.has(id)) return;
    const product = byId.get(id);
    if (!product) return;
    seen.add(id);
    products.push(product);
  });

  return products;
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Son deneme';

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  });
}

function environmentLabel(value: TryOnEnvironment) {
  return ENVIRONMENT_OPTIONS.find((environment) => environment.id === value)?.label ?? 'Kabin';
}

function getTryOnFileName(preview: TryOnPreview) {
  const safeId = preview.id.replace(/[^a-z0-9-]/gi, '').slice(0, 42) || 'deneme';
  return `chat2shop-kabin-${safeId}.png`;
}

async function getLocalTryOnImageUri(preview: TryOnPreview) {
  if (preview.previewImageUri.startsWith('file://')) return preview.previewImageUri;

  const file = new File(Paths.cache, getTryOnFileName(preview));
  const downloaded = await File.downloadFileAsync(preview.previewImageUri, file, { idempotent: true });
  return downloaded.uri;
}

type WebAnchor = {
  href: string;
  download: string;
  target: string;
  click: () => void;
  remove: () => void;
};

async function downloadImageOnWeb(uri: string, fileName: string) {
  const globalRef = globalThis as typeof globalThis & {
    document?: {
      createElement: (tagName: string) => WebAnchor;
      body: { appendChild: (node: WebAnchor) => void };
    };
    URL?: {
      createObjectURL: (blob: Blob) => string;
      revokeObjectURL: (url: string) => void;
    };
  };
  const documentRef = globalRef.document;
  if (!documentRef) throw new Error('Web document is not available.');

  const anchor = documentRef.createElement('a');
  let objectUrl: string | undefined;
  try {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Image request failed with ${response.status}`);
    const blob = await response.blob();
    objectUrl = globalRef.URL?.createObjectURL(blob);
    anchor.href = objectUrl ?? uri;
  } catch {
    anchor.href = uri;
  }

  anchor.download = fileName;
  anchor.target = '_blank';
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  if (objectUrl) globalRef.URL?.revokeObjectURL(objectUrl);
}

const styles = StyleSheet.create({
  header: {
    gap: 5,
    paddingTop: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 5,
  },
  title: {
    color: colors.inkStrong,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  creditPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: colors.rewardSoft,
    borderWidth: 1,
    borderColor: colors.rewardSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditText: {
    color: colors.reward,
    fontSize: 12,
    fontWeight: '900',
  },
  studioCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  studioPreviewWrap: {
    width: 96,
    height: 122,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
  },
  studioPreview: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.tryOnSoft,
    opacity: 0.72,
  },
  avatarFigure: {
    width: 66,
    height: 74,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: -2,
  },
  avatarBody: {
    width: 54,
    height: 34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  studioContent: {
    flex: 1,
    gap: 9,
    justifyContent: 'center',
  },
  studioTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  studioText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  studioActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoActionText: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  recentButton: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentThumbnail: {
    width: 58,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
  },
  recentCopy: {
    flex: 1,
    gap: 2,
  },
  recentEyebrow: {
    color: colors.tryOn,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  recentTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  recentText: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  recentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.tryOnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyModalSafe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  historyModalHeader: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  historyModalHeaderDetail: {
    backgroundColor: colors.canvas,
  },
  historyModalSpacer: {
    flex: 1,
  },
  historyModalTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  historyModalTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    fontWeight: '900',
  },
  historyModalSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  modalCircleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCirclePlaceholder: {
    width: 46,
    height: 46,
  },
  historyModalGrid: {
    padding: 16,
    paddingBottom: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewDetail: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  previewDetailImageWrap: {
    flex: 1,
    minHeight: 320,
    borderRadius: 26,
    backgroundColor: colors.inkStrong,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewDetailImage: {
    width: '100%',
    height: '100%',
  },
  previewDetailInfo: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  previewDetailEyebrow: {
    color: colors.tryOn,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewDetailTitle: {
    color: colors.inkStrong,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  previewDetailText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  previewDetailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalActionButton: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  modalActionButtonPrimary: {
    backgroundColor: colors.commerce,
    borderColor: colors.commerce,
  },
  modalActionButtonDisabled: {
    opacity: 0.58,
  },
  modalActionText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  modalActionTextPrimary: {
    color: colors.surface,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: 360,
    backgroundColor: colors.surfaceSubtle,
  },
  resultContent: {
    padding: 14,
    gap: 9,
  },
  resultEyebrow: {
    color: colors.tryOn,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resultTitle: {
    color: colors.inkStrong,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  resultText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  secondaryActions: {
    gap: 8,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: colors.surfaceSubtle,
    padding: 3,
  },
  segmentButton: {
    minHeight: 30,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.inkStrong,
  },
  historyRail: {
    gap: 10,
    paddingRight: 16,
  },
  historyCard: {
    width: '48%',
    minHeight: 244,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyImage: {
    width: '100%',
    height: 178,
    backgroundColor: colors.surfaceSubtle,
  },
  historyTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  historyMeta: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },
  emptyHistory: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 4,
  },
  emptyHistoryTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyHistoryText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  productRail: {
    gap: 10,
    paddingRight: 16,
  },
  productCard: {
    width: 126,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productCardSelected: {
    borderColor: colors.tryOn,
    backgroundColor: colors.tryOnSoft,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tryOn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.surfaceSubtle,
  },
  productText: {
    padding: 9,
    gap: 4,
  },
  productTitle: {
    color: colors.inkStrong,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
  },
  productMeta: {
    color: colors.inkSoft,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
  emptyRail: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emptyRailText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 13,
  },
  settingsHeader: {
    gap: 3,
  },
  settingsTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  settingsText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  controlBlock: {
    gap: 8,
  },
  controlTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frameHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  frameHintLabel: {
    color: colors.tryOn,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingTop: 2,
  },
  frameHintCopy: {
    flex: 1,
    gap: 3,
  },
  frameHintTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  frameHintText: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.commerceSoft,
    borderRadius: 14,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  processingCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tryOnSoft,
    padding: 13,
  },
  processingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  processingCopy: {
    flex: 1,
    gap: 3,
    zIndex: 1,
  },
  processingTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  processingText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  processingSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 82,
    backgroundColor: colors.surface,
    opacity: 0.42,
  },
});
