import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Check, ChevronDown, ChevronUp, Coins, Download, ImagePlus, Maximize2, RefreshCcw, WandSparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { TagEditor } from '@/components/TagEditor';
import {
  SellerMetricTile,
  SellerProgressBar,
  SellerScreenShell,
  SellerSection,
  SellerStatusPill,
} from '@/components/seller/SellerUI';
import { uploadSellerImage } from '@/services/firebaseUpload';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { GeneratedListing, ProductImageEnhancementMode, ProductImageEnhancementResult } from '@/types';

type ListingPanel = 'copy' | 'details' | 'visibility';

const PRODUCT_IMAGE_ASPECT_RATIO = 4 / 5;
const PRODUCT_IMAGE_PICKER_ASPECT: [number, number] = [4, 5];

const aiPreparedFields = ['Ürün adı', 'Açıklama', 'Kategori', 'Renk', 'Etiketler', 'Arama niyetleri'];
const listingPanels: { id: ListingPanel; label: string }[] = [
  { id: 'copy', label: 'Satış metni' },
  { id: 'details', label: 'Ürün detayları' },
  { id: 'visibility', label: 'AI görünürlük' },
];
const imageEnhancementModes: Array<{
  id: ProductImageEnhancementMode;
  label: string;
  description: string;
}> = [
  { id: 'catalog_white', label: 'Katalog Beyazı', description: 'Temiz fon' },
  { id: 'premium_studio', label: 'Premium Stüdyo', description: 'Soft ışık' },
  { id: 'editorial_minimal', label: 'Editoryal Minimal', description: 'Rafine kadraj' },
  { id: 'lifestyle_commerce', label: 'Lifestyle Commerce', description: 'Doğal ortam' },
];

export default function SellerScreen() {
  const {
    currentUser,
    repositoryMode,
    canManageSeller,
    sellerDraft,
    sellerCreditAccount,
    sellerCreditLoading,
    generatedListing,
    aiGenerationStatus,
    aiGenerationError,
    productImageEnhancementStatus,
    productImageEnhancementError,
    productImageEnhancementPreview,
    selectedProductImageEnhancementMode,
    lastAIReasoning,
    sellerProducts,
    updateSellerDraft,
    setProductImageEnhancementMode,
    enhanceSellerProductImage,
    acceptEnhancedProductImage,
    discardEnhancedProductImage,
    generateSellerListing,
    regenerateSellerListing,
    updateGeneratedListing,
    publishListing,
  } = useAppState();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showOptionalHints, setShowOptionalHints] = useState(false);
  const [showAdvancedMetadata, setShowAdvancedMetadata] = useState(false);
  const [activeListingPanel, setActiveListingPanel] = useState<ListingPanel>('copy');
  const [imageUploadStatus, setImageUploadStatus] = useState<'idle' | 'loading'>('idle');

  async function pickProductImage() {
    if (!canManageSeller) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Ürün görseli seçmek için galeri erişimine izin vermen gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: PRODUCT_IMAGE_PICKER_ASPECT,
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        setImageUploadStatus('loading');
        const imageUrl = await uploadSellerImage(result.assets[0].uri, currentUser?.id ?? 'demo-seller');
        updateSellerDraft({ imageUrl });
      } catch (error) {
        Alert.alert('Görsel yüklenemedi', error instanceof Error ? error.message : 'Lütfen farklı bir görsel dene.');
      } finally {
        setImageUploadStatus('idle');
      }
    }
  }

  const aiLoading = aiGenerationStatus === 'loading';
  const draftValidation = validateDraft(sellerDraft, repositoryMode);
  const listingValidation = generatedListing ? validateListing(generatedListing) : [];
  const availableAICredits = sellerCreditAccount
    ? sellerCreditAccount.freeCredits + sellerCreditAccount.paidCredits
    : undefined;
  const hasAICredits = typeof availableAICredits === 'undefined' || availableAICredits >= 1;
  const imageEnhanceCost = 5;
  const hasImageEnhanceCredits = typeof availableAICredits === 'undefined' || availableAICredits >= imageEnhanceCost;
  const imageEnhanceLoading = productImageEnhancementStatus === 'loading';
  const canEnhanceImage = canManageSeller && Boolean(sellerDraft.imageUrl.trim()) && !imageEnhanceLoading && hasImageEnhanceCredits;
  const canGenerateListing = canManageSeller && !aiLoading && draftValidation.required.length === 0 && hasAICredits;
  const canPublishListing =
    canManageSeller && Boolean(generatedListing) && draftValidation.required.length === 0 && draftValidation.publish.length === 0 && listingValidation.length === 0;

  return (
    <SellerScreenShell
      eyebrow="AI ürün ekleme"
      title="Yeni ürün"
      subtitle="Fotoğrafı ekle, fiyat ve stok gir. Ürün adı, açıklama ve etiketleri AI hazırlasın."
      action={
        <CreditBalancePill
          credits={availableAICredits}
          loading={sellerCreditLoading}
          onPress={() => router.push('/seller-credits')}
        />
      }
    >
      {!canManageSeller ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Satıcı yetkisi gerekli</Text>
          <Text style={styles.warningText}>Firebase modunda ürün yönetimi için seller rolüyle giriş yapılmalı.</Text>
        </View>
      ) : null}

      <SellerSection title="Ürünü başlat" subtitle="Satışa çıkmak için gereken minimum bilgiler.">
        <View style={styles.starterCard}>
          <View style={styles.uploadPreviewWrap}>
            {sellerDraft.imageUrl ? (
              <Image source={{ uri: sellerDraft.imageUrl }} style={styles.uploadImage} resizeMode="cover" />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <ImagePlus size={30} color={colors.mutedSoft} />
                <Text style={styles.uploadPlaceholderTitle}>Ürün fotoğrafı ekle</Text>
                <Text style={styles.uploadPlaceholderText}>AI listeleme için ilk adım görsel seçmek.</Text>
              </View>
            )}
            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>Ürün fotoğrafı</Text>
            </View>
          </View>
          <Pressable style={styles.uploadButton} onPress={pickProductImage} disabled={!canManageSeller}>
            <ImagePlus size={16} color={colors.inkStrong} />
            <Text style={styles.uploadButtonText}>{imageUploadStatus === 'loading' ? 'Görsel yükleniyor...' : 'Cihazdan görsel seç'}</Text>
          </Pressable>
          <ProductImageEnhancePanel
            imageUrl={sellerDraft.imageUrl}
            cost={imageEnhanceCost}
            hasCredits={hasImageEnhanceCredits}
            loading={imageEnhanceLoading}
            preview={productImageEnhancementPreview}
            selectedMode={selectedProductImageEnhancementMode}
            modes={imageEnhancementModes}
            error={productImageEnhancementError}
            onSelectMode={setProductImageEnhancementMode}
            onEnhance={enhanceSellerProductImage}
            onAccept={acceptEnhancedProductImage}
            onDiscard={discardEnhancedProductImage}
            onAddCredits={() => router.push('/seller-credits')}
            disabled={!canEnhanceImage}
          />
          <Pressable style={styles.textToggle} onPress={() => setShowUrlInput((current) => !current)}>
            <Text style={styles.textToggleLabel}>URL ile ekle</Text>
            {showUrlInput ? <ChevronUp size={15} color={colors.mutedSoft} /> : <ChevronDown size={15} color={colors.mutedSoft} />}
          </Pressable>
          {showUrlInput ? (
            <LabeledInput label="Görsel URL" value={sellerDraft.imageUrl} onChangeText={(imageUrl) => updateSellerDraft({ imageUrl })} />
          ) : null}
        </View>

        <View style={styles.quickForm}>
          <View style={styles.twoColumnRow}>
            <LabeledInput label="Fiyat" value={sellerDraft.price} onChangeText={(price) => updateSellerDraft({ price })} keyboardType="numeric" />
            <LabeledInput label="Stok" value={sellerDraft.stock} onChangeText={(stock) => updateSellerDraft({ stock })} keyboardType="numeric" />
          </View>
          <LabeledInput label="Bedenler" value={sellerDraft.sizes} onChangeText={(sizes) => updateSellerDraft({ sizes })} />
        </View>
        <ValidationList errors={draftValidation.required} />

        <Pressable style={styles.hintToggle} onPress={() => setShowOptionalHints((current) => !current)}>
          <View>
            <Text style={styles.hintTitle}>AI’a ipucu ver</Text>
            <Text style={styles.hintText}>İstersen ürün adı veya kategori ipucu ekle.</Text>
          </View>
          {showOptionalHints ? <ChevronUp size={17} color={colors.inkSoft} /> : <ChevronDown size={17} color={colors.inkSoft} />}
        </Pressable>
        {showOptionalHints ? (
          <View style={styles.quickForm}>
            <LabeledInput
              label="Opsiyonel ad"
              value={sellerDraft.optionalName}
              onChangeText={(optionalName) => updateSellerDraft({ optionalName })}
            />
            <LabeledInput
              label="Opsiyonel kategori"
              value={sellerDraft.optionalCategory}
              onChangeText={(optionalCategory) => updateSellerDraft({ optionalCategory })}
            />
          </View>
        ) : null}

        <View style={styles.aiChecklist}>
          <Text style={styles.aiChecklistTitle}>Chat2Shop şunları hazırlar</Text>
          <View style={styles.aiChecklistGrid}>
            {aiPreparedFields.map((field) => (
              <View key={field} style={styles.aiCheckItem}>
                <Check size={12} color={colors.ai} />
                <Text style={styles.aiCheckText}>{field}</Text>
              </View>
            ))}
          </View>
        </View>

        <AICostRow
          hasCredits={hasAICredits}
          loading={sellerCreditLoading}
          onAddCredits={() => router.push('/seller-credits')}
        />

        <View style={styles.actionRow}>
          <ActionButton
            label={aiLoading ? 'Listeleme hazırlanıyor...' : 'AI ile listelemeyi hazırla'}
            icon={<WandSparkles size={16} color={colors.surface} />}
            tone="ai"
            onPress={generateSellerListing}
            disabled={!canGenerateListing}
          />
          {generatedListing ? (
            <ActionButton
              label="Yeniden hazırla"
              variant="secondary"
              icon={<RefreshCcw size={15} color={colors.inkStrong} />}
              onPress={regenerateSellerListing}
              disabled={!canManageSeller || aiLoading}
            />
          ) : null}
        </View>
        {aiGenerationError ? <Text style={styles.error}>{aiGenerationError}</Text> : null}
      </SellerSection>

      {generatedListing ? (
        <SellerSection title="AI listing" subtitle="Yayına almadan önce gerekli alanları sade panellerden düzenle.">
          <View style={styles.generatedSummary}>
            <View style={styles.generatedSummaryCopy}>
              <Text style={styles.generatedSource}>{sourceLabel(generatedListing)}</Text>
              <Text style={styles.generatedSummaryTitle} numberOfLines={2}>{generatedListing.title}</Text>
              <Text style={styles.generatedSummaryText} numberOfLines={2}>{generatedListing.recommendation}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreNumber}>{generatedListing.visibilityScore}</Text>
              <Text style={styles.scoreLabel}>/100</Text>
            </View>
          </View>
          {generatedListing.aiSource === 'manual' ? (
            <View style={styles.manualNotice}>
              <Text style={styles.manualNoticeTitle}>Manuel düzenleme modu</Text>
              <Text style={styles.manualNoticeText}>AI tamamlanamadı. Alanları kontrol edip düzenledikten sonra ürünü yayına alabilirsin.</Text>
            </View>
          ) : null}
          <ValidationList errors={listingValidation} />

          <View style={styles.panelTabs}>
            {listingPanels.map((panel) => (
              <Pressable
                key={panel.id}
                style={[styles.panelTab, activeListingPanel === panel.id && styles.panelTabActive]}
                onPress={() => setActiveListingPanel(panel.id)}
              >
                <Text style={[styles.panelTabText, activeListingPanel === panel.id && styles.panelTabTextActive]}>
                  {panel.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeListingPanel === 'copy' ? (
            <View style={styles.panelContent}>
              <TextInput
                value={generatedListing.title}
                onChangeText={(title) => updateGeneratedListing({ title })}
                style={styles.titleInput}
              />
              <TextInput
                value={generatedListing.shortDescription}
                onChangeText={(shortDescription) => updateGeneratedListing({ shortDescription })}
                style={styles.textArea}
                multiline
              />
              <TextInput
                value={generatedListing.longDescription}
                onChangeText={(longDescription) => updateGeneratedListing({ longDescription })}
                style={[styles.textArea, styles.longTextArea]}
                multiline
              />
            </View>
          ) : null}

          {activeListingPanel === 'details' ? (
            <View style={styles.panelContent}>
              <View style={styles.twoColumnRow}>
                <LabeledInput label="Renk" value={generatedListing.color} onChangeText={(color) => updateGeneratedListing({ color })} />
                <LabeledInput
                  label="Kategori"
                  value={generatedListing.category}
                  onChangeText={(category) => updateGeneratedListing({ category: category as GeneratedListing['category'] })}
                />
              </View>
              <View style={styles.twoColumnRow}>
                <LabeledInput label="Fit" value={generatedListing.fit} onChangeText={(fit) => updateGeneratedListing({ fit })} />
                <LabeledInput
                  label="Modesty"
                  value={generatedListing.modesty}
                  onChangeText={(modesty) => updateGeneratedListing({ modesty: modesty as GeneratedListing['modesty'] })}
                />
              </View>
              <TagEditor title="Sezon" values={generatedListing.season} onChange={(season) => updateGeneratedListing({ season })} />

              <Pressable style={styles.hintToggle} onPress={() => setShowAdvancedMetadata((current) => !current)}>
                <View>
                  <Text style={styles.hintTitle}>Gelişmiş metadata</Text>
                  <Text style={styles.hintText}>Etiket ve arama niyetlerini düzenle.</Text>
                </View>
                {showAdvancedMetadata ? <ChevronUp size={17} color={colors.inkSoft} /> : <ChevronDown size={17} color={colors.inkSoft} />}
              </Pressable>
              {showAdvancedMetadata ? (
                <View style={styles.advancedMetadata}>
                  <TagEditor title="Keywords" values={generatedListing.keywords} onChange={(keywords) => updateGeneratedListing({ keywords })} />
                  <TagEditor
                    title="Style"
                    values={generatedListing.styleTags}
                    onChange={(styleTags) => updateGeneratedListing({ styleTags: styleTags as GeneratedListing['styleTags'] })}
                  />
                  <TagEditor title="Vibe" values={generatedListing.vibeTags} onChange={(vibeTags) => updateGeneratedListing({ vibeTags })} />
                  <TagEditor
                    title="Occasion"
                    values={generatedListing.occasionTags}
                    onChange={(occasionTags) => updateGeneratedListing({ occasionTags: occasionTags as GeneratedListing['occasionTags'] })}
                  />
                  <TagEditor
                    title="AI Search Intents"
                    values={generatedListing.aiSearchIntents}
                    onChange={(aiSearchIntents) => updateGeneratedListing({ aiSearchIntents })}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {activeListingPanel === 'visibility' ? (
            <View style={styles.panelContent}>
              <View style={styles.visibilityCard}>
                <View style={styles.scoreBoxLarge}>
                  <Text style={styles.scoreLargeNumber}>{generatedListing.visibilityScore}</Text>
                  <Text style={styles.scoreLabel}>AI skor</Text>
                </View>
                <View style={styles.visibilityCopy}>
                  <Text style={styles.visibilityTitle}>Ürün önerilere hazır görünüyor</Text>
                  <Text style={styles.visibilityText}>{generatedListing.recommendation}</Text>
                </View>
              </View>
              <SellerProgressBar value={generatedListing.visibilityScore} tone={generatedListing.visibilityScore < 80 ? 'warning' : 'ai'} />

              <View style={styles.reasoningBox}>
                <Text style={styles.reasoningTitle}>AI neden böyle hazırladı?</Text>
                <Text style={styles.reasoningText}>{lastAIReasoning ?? generatedListing.reasoning}</Text>
              </View>

              <View style={styles.breakdownGrid}>
                {Object.entries(generatedListing.visibilityScoreBreakdown).map(([label, value]) => (
                  <SellerMetricTile key={label} label={formatBreakdownLabel(label)} value={`${value}/100`} />
                ))}
              </View>
            </View>
          ) : null}
        </SellerSection>
      ) : null}

      {generatedListing ? (
        <SellerSection title="Yayına al" subtitle="Yayınladıktan sonra Ürünler ekranından düzenleyebilirsin.">
          <View style={styles.publishSummary}>
            <SellerStatusPill label={`${sellerProducts.length} satıcı ürünü`} tone="brand" />
            <SellerStatusPill label={`AI ${generatedListing.visibilityScore}/100`} tone="ai" />
          </View>
          <ValidationList errors={[...draftValidation.required, ...draftValidation.publish, ...listingValidation]} />
          <Text style={styles.publishHint}>Ürün aktif olarak yayına alınır ve alıcı kataloglarında görünür.</Text>
          <ActionButton
            label={generatedListing.status === 'published' ? 'Yayında' : 'Ürünü yayına al'}
            icon={<Check size={16} color={colors.surface} />}
            tone="commerce"
            onPress={publishListing}
            disabled={!canPublishListing}
          />
        </SellerSection>
      ) : null}
    </SellerScreenShell>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor={colors.mutedSoft}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function CreditBalancePill({
  credits,
  loading,
  onPress,
}: {
  credits: number | undefined;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.headerCreditButton} onPress={onPress}>
      <Coins size={13} color={colors.credit} />
      <Text style={styles.headerCreditValue}>
        {loading ? '...' : typeof credits === 'number' ? `${credits}` : '-'}
      </Text>
      <Text style={styles.headerCreditLabel}>jeton</Text>
    </Pressable>
  );
}

function AICostRow({
  hasCredits,
  loading,
  onAddCredits,
}: {
  hasCredits: boolean;
  loading: boolean;
  onAddCredits: () => void;
}) {
  const message = loading
    ? 'Jeton bakiyesi yükleniyor'
    : hasCredits
      ? '1 jeton kullanılır · AI başarısız olursa düşülmez'
      : 'Jeton yok · AI listeleme için jeton ekle';

  return (
    <View style={[styles.aiCostRow, !hasCredits && !loading && styles.aiCostRowWarning]}>
      <Text style={[styles.aiCostText, !hasCredits && !loading && styles.aiCostTextWarning]}>
        {message}
      </Text>
      {!hasCredits && !loading ? (
        <Pressable style={styles.aiCostLink} onPress={onAddCredits}>
          <Text style={styles.aiCostLinkText}>Jeton ekle</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProductImageEnhancePanel({
  imageUrl,
  cost,
  hasCredits,
  loading,
  preview,
  selectedMode,
  modes,
  error,
  disabled,
  onSelectMode,
  onEnhance,
  onAccept,
  onDiscard,
  onAddCredits,
}: {
  imageUrl: string;
  cost: number;
  hasCredits: boolean;
  loading: boolean;
  preview?: ProductImageEnhancementResult & { originalImageUrl: string };
  selectedMode: ProductImageEnhancementMode;
  modes: Array<{ id: ProductImageEnhancementMode; label: string; description: string }>;
  error?: string;
  disabled: boolean;
  onSelectMode: (mode: ProductImageEnhancementMode) => void;
  onEnhance: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  onAddCredits: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<{ label: string; uri: string } | undefined>();
  const hasImage = Boolean(imageUrl.trim());
  const isExpanded = expanded || loading || Boolean(preview) || Boolean(error);
  const message = !hasImage
    ? 'Ürün fotoğrafı ekleyince kullanabilirsin.'
    : hasCredits
      ? `${cost} jeton · Beğenirsen kullan`
      : `${cost} jeton gerekli · Jeton ekle`;

  async function downloadPreviewImage() {
    if (!preview?.enhancedImageUrl) return;

    try {
      if (Platform.OS === 'web') {
        const documentRef = (globalThis as typeof globalThis & { document?: Document }).document;
        const urlRef = (globalThis as typeof globalThis & { URL?: typeof URL }).URL;
        if (documentRef) {
          const anchor = documentRef.createElement('a');
          try {
            const response = await fetch(preview.enhancedImageUrl);
            const blob = await response.blob();
            const objectUrl = urlRef?.createObjectURL(blob);
            anchor.href = objectUrl ?? preview.enhancedImageUrl;
            anchor.download = 'chat2shop-ai-urun-fotografi.png';
            documentRef.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            if (objectUrl) urlRef?.revokeObjectURL(objectUrl);
            return;
          } catch {
            anchor.href = preview.enhancedImageUrl;
          }
          anchor.download = 'chat2shop-ai-urun-fotografi.png';
          anchor.target = '_blank';
          documentRef.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          return;
        }
      }

      await Linking.openURL(preview.enhancedImageUrl);
    } catch {
      Alert.alert('Fotoğraf açılamadı', 'Görseli indirmek için bağlantıyı tarayıcıda açmayı tekrar dene.');
    }
  }

  return (
    <View style={styles.enhancePanel}>
      <Pressable style={styles.enhanceHeader} onPress={() => setExpanded((current) => !current)}>
        <View style={styles.enhanceIconBox}>
          <WandSparkles size={15} color={colors.ai} />
        </View>
        <View style={styles.enhanceCopy}>
          <Text style={styles.enhanceTitle}>Fotoğrafı profesyonelleştir</Text>
          <Text style={[styles.enhanceText, !hasCredits && hasImage && styles.enhanceTextWarning]}>
            {loading ? 'Görsel hazırlanıyor...' : message}
          </Text>
        </View>
        <View style={styles.enhanceHeaderRight}>
          {preview ? <Text style={styles.enhanceReadyPill}>Hazır</Text> : null}
          {isExpanded ? <ChevronUp size={18} color={colors.inkSoft} /> : <ChevronDown size={18} color={colors.inkSoft} />}
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.enhanceExpandedBody}>
          <View style={styles.enhanceModeWrap}>
            <Text style={styles.enhanceModeLabel}>Fotoğraf modu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.enhanceModeRail}>
              {modes.map((mode) => {
                const selected = mode.id === selectedMode;
                return (
                  <Pressable
                    key={mode.id}
                    style={[styles.enhanceModeChip, selected && styles.enhanceModeChipSelected]}
                    onPress={() => onSelectMode(mode.id)}
                    disabled={loading}
                  >
                    <Text style={[styles.enhanceModeChipTitle, selected && styles.enhanceModeChipTitleSelected]}>{mode.label}</Text>
                    <Text style={[styles.enhanceModeChipText, selected && styles.enhanceModeChipTextSelected]}>{mode.description}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {!preview ? (
            <View style={styles.enhanceGenerateBox}>
              <Text style={styles.enhanceGenerateText}>Tek görsel oluşturulur. Sonucu beğenirsen ürün fotoğrafı olarak kullanırsın.</Text>
              {!hasCredits && hasImage ? (
                <Pressable style={styles.enhanceGenerateButton} onPress={onAddCredits}>
                  <Coins size={15} color={colors.surface} />
                  <Text style={styles.enhanceGenerateButtonText}>Jeton ekle</Text>
                </Pressable>
              ) : (
                <Pressable style={[styles.enhanceGenerateButton, disabled && styles.enhanceGenerateButtonDisabled]} onPress={onEnhance} disabled={disabled}>
                  <WandSparkles size={15} color={disabled ? colors.mutedSoft : colors.surface} />
                  <Text style={[styles.enhanceGenerateButtonText, disabled && styles.enhanceGenerateButtonTextDisabled]}>
                    {loading ? 'Yeni fotoğraf hazırlanıyor...' : 'Yeni fotoğraf oluştur'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.enhancePreview}>
              <Text style={styles.enhancePreviewMode}>
                Mod: {modes.find((mode) => mode.id === preview.mode)?.label ?? modes.find((mode) => mode.id === selectedMode)?.label}
              </Text>
              <View style={styles.enhancePreviewImages}>
                <PreviewImage label="Orijinal" uri={preview.originalImageUrl} onPress={() => setFullScreenImage({ label: 'Orijinal', uri: preview.originalImageUrl })} />
                <PreviewImage label="Yeni fotoğraf" uri={preview.enhancedImageUrl} featured onPress={() => setFullScreenImage({ label: 'Yeni fotoğraf', uri: preview.enhancedImageUrl })} />
              </View>
              <View style={styles.enhanceActions}>
                <Pressable style={styles.enhanceSecondaryAction} onPress={onDiscard}>
                  <Text style={styles.enhanceSecondaryActionText}>Vazgeç</Text>
                </Pressable>
                <Pressable style={styles.enhanceSecondaryAction} onPress={downloadPreviewImage}>
                  <Download size={14} color={colors.inkStrong} />
                  <Text style={styles.enhanceSecondaryActionText}>İndir</Text>
                </Pressable>
                <Pressable style={styles.enhancePrimaryAction} onPress={onAccept}>
                  <Text style={styles.enhancePrimaryActionText}>Bu görseli kullan</Text>
                </Pressable>
              </View>
            </View>
          )}

          {error ? <Text style={styles.enhanceError}>{error}</Text> : null}
        </View>
      ) : null}

      <Modal visible={Boolean(fullScreenImage)} transparent animationType="fade" onRequestClose={() => setFullScreenImage(undefined)}>
        <View style={styles.fullPreviewOverlay}>
          <View style={styles.fullPreviewHeader}>
            <Text style={styles.fullPreviewTitle}>{fullScreenImage?.label}</Text>
            <Pressable style={styles.fullPreviewClose} onPress={() => setFullScreenImage(undefined)}>
              <X size={20} color={colors.inkStrong} />
            </Pressable>
          </View>
          {fullScreenImage ? <Image source={{ uri: fullScreenImage.uri }} style={styles.fullPreviewImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

function PreviewImage({ label, uri, featured, onPress }: { label: string; uri: string; featured?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.previewImageCard, featured && styles.previewImageCardFeatured]} onPress={onPress}>
      <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
      <View style={styles.previewImageLabel}>
        <Text style={styles.previewImageLabelText}>{label}</Text>
      </View>
      <View style={styles.previewOpenBadge}>
        <Maximize2 size={12} color={colors.inkStrong} />
      </View>
    </Pressable>
  );
}

function sourceLabel(listing: GeneratedListing) {
  const source =
    listing.aiSource === 'remote'
      ? 'Gemini'
      : listing.aiSource === 'manual'
        ? 'Manuel'
        : listing.aiSource === 'mock'
          ? 'Mock'
          : 'Fallback';
  return `${source} · ${listing.confidence} güven`;
}

function ValidationList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <View style={styles.validationBox}>
      {errors.map((error) => (
        <Text key={error} style={styles.validationText}>{error}</Text>
      ))}
    </View>
  );
}

function validateDraft(draft: { imageUrl: string; price: string; stock: string; sizes: string }, repositoryMode: string) {
  const required: string[] = [];
  const publish: string[] = [];
  const price = Number(draft.price.replace(',', '.'));
  const stock = Number(draft.stock);
  const sizes = parseSizes(draft.sizes);

  if (!draft.imageUrl.trim()) required.push('Ürün görseli eklenmeli.');
  if (!Number.isFinite(price) || price <= 0) required.push('Fiyat pozitif bir sayı olmalı.');
  if (!Number.isInteger(stock) || stock <= 0) required.push('Stok pozitif bir tam sayı olmalı.');
  if (sizes.length === 0) required.push('En az bir beden seçeneği girilmeli.');
  if (repositoryMode === 'firebase' && draft.imageUrl.trim() && !isHttpUrl(draft.imageUrl)) {
    publish.push('Yayına almak için görsel Storage’a yüklenmiş veya HTTP/HTTPS URL olmalı.');
  }

  return { required, publish };
}

function validateListing(listing: GeneratedListing) {
  const errors: string[] = [];
  if (!listing.title.trim()) errors.push('Ürün adı boş olamaz.');
  if (!listing.shortDescription.trim() && !listing.longDescription.trim()) errors.push('Ürün açıklaması boş olamaz.');
  if (!listing.color.trim()) errors.push('Renk bilgisi boş olamaz.');
  if (!listing.fit.trim()) errors.push('Fit bilgisi boş olamaz.');
  return errors;
}

function parseSizes(value: string) {
  return value
    .split(/[,\s]+/)
    .map((size) => size.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function formatBreakdownLabel(label: string) {
  const labels: Record<string, string> = {
    image: 'Görsel',
    price: 'Fiyat',
    stock: 'Stok',
    sizes: 'Beden',
    category: 'Kategori',
    naming: 'İsim',
    metadataDepth: 'Metadata',
  };
  return labels[label] ?? label;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerCreditButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  headerCreditValue: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  headerCreditLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  warningBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warning,
    padding: 14,
    gap: 5,
  },
  warningTitle: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: '900',
  },
  warningText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  starterCard: {
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 10,
  },
  uploadPreviewWrap: {
    width: 190,
    maxWidth: '100%',
    aspectRatio: PRODUCT_IMAGE_ASPECT_RATIO,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  uploadImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 7,
  },
  uploadPlaceholderTitle: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadPlaceholderText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  uploadBadgeText: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  uploadButton: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadButtonText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  enhancePanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 10,
  },
  enhanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  enhanceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhanceCopy: {
    flex: 1,
    gap: 3,
  },
  enhanceTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  enhanceText: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  enhanceTextWarning: {
    color: colors.warningStrong,
  },
  enhanceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  enhanceReadyPill: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.aiSoft,
    color: colors.ai,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  enhanceExpandedBody: {
    gap: 12,
  },
  enhanceSmallButton: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhanceSmallButtonDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  enhanceSmallButtonText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  enhanceSmallButtonTextDisabled: {
    color: colors.mutedSoft,
  },
  enhanceModeWrap: {
    gap: 7,
  },
  enhanceModeLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  enhanceModeRail: {
    gap: 8,
    paddingRight: 2,
  },
  enhanceModeChip: {
    minWidth: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  enhanceModeChipSelected: {
    borderColor: colors.ai,
    backgroundColor: colors.aiSoft,
  },
  enhanceModeChipTitle: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  enhanceModeChipTitleSelected: {
    color: colors.ai,
  },
  enhanceModeChipText: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
  },
  enhanceModeChipTextSelected: {
    color: colors.inkSoft,
  },
  enhanceGenerateBox: {
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    gap: 10,
  },
  enhanceGenerateText: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  enhanceGenerateButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  enhanceGenerateButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  enhanceGenerateButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  enhanceGenerateButtonTextDisabled: {
    color: colors.mutedSoft,
  },
  enhancePreview: {
    gap: 10,
  },
  enhancePreviewMode: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  enhancePreviewImages: {
    flexDirection: 'row',
    gap: 9,
  },
  previewImageCard: {
    flex: 1,
    aspectRatio: PRODUCT_IMAGE_ASPECT_RATIO,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImageCardFeatured: {
    borderColor: colors.ai,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageLabel: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  previewImageLabelText: {
    color: colors.inkStrong,
    fontSize: 10,
    fontWeight: '900',
  },
  previewOpenBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhanceSecondaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  enhanceSecondaryActionText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  enhancePrimaryAction: {
    flex: 1.4,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancePrimaryActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  enhanceError: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  fullPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,24,33,0.94)',
    padding: 20,
    justifyContent: 'center',
  },
  fullPreviewHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 56,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullPreviewTitle: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  fullPreviewClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '78%',
    borderRadius: 24,
  },
  textToggle: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  textToggleLabel: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  quickForm: {
    gap: 10,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
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
  hintToggle: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hintTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  hintText: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  aiChecklist: {
    borderRadius: 20,
    backgroundColor: colors.aiSoft,
    padding: 13,
    gap: 10,
  },
  aiChecklistTitle: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '900',
  },
  aiChecklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiCheckItem: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiCheckText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  aiCostRow: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  aiCostRowWarning: {
    backgroundColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  aiCostText: {
    flex: 1,
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  aiCostTextWarning: {
    color: colors.warningStrong,
  },
  aiCostLink: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCostLinkText: {
    color: colors.warningStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  generatedSummary: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
  },
  generatedSummaryCopy: {
    flex: 1,
    gap: 5,
  },
  generatedSource: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  generatedSummaryTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  generatedSummaryText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  manualNotice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warning,
    padding: 12,
    gap: 5,
  },
  manualNoticeTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  manualNoticeText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  validationBox: {
    borderRadius: 16,
    backgroundColor: colors.commerceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  validationText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  scoreBox: {
    width: 68,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: colors.ai,
    fontSize: 22,
    fontWeight: '900',
  },
  scoreLabel: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  panelTabs: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 4,
    gap: 4,
  },
  panelTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  panelTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTabText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  panelTabTextActive: {
    color: colors.inkStrong,
  },
  panelContent: {
    gap: 11,
  },
  titleInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    color: colors.inkStrong,
    fontSize: 17,
    fontWeight: '900',
  },
  textArea: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    color: colors.inkStrong,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  longTextArea: {
    minHeight: 118,
  },
  advancedMetadata: {
    gap: 11,
  },
  visibilityCard: {
    borderRadius: 22,
    backgroundColor: colors.aiSoft,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  scoreBoxLarge: {
    width: 78,
    height: 74,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLargeNumber: {
    color: colors.ai,
    fontSize: 25,
    fontWeight: '900',
  },
  visibilityCopy: {
    flex: 1,
    gap: 5,
  },
  visibilityTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  visibilityText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  reasoningBox: {
    borderRadius: 18,
    backgroundColor: colors.aiSoft,
    padding: 12,
    gap: 6,
  },
  reasoningTitle: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '900',
  },
  reasoningText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  publishSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  publishHint: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
