import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArrowLeft, FileText, Gauge, RotateCcw, Save, Search, WandSparkles } from 'lucide-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { TagEditor } from '@/components/TagEditor';
import { generateProductIntelligence } from '@/services/productIntelligence';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import {
  Category,
  GeneratedListing,
  ModestyLevel,
  OccasionTag,
  Product,
  SellerDraft,
  StyleTag,
  VisibilityScoreBreakdown,
} from '@/types';

type AIAction = 'complete' | 'search' | 'description' | 'score';

export default function SellerProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    catalog,
    canManageSeller,
    updateSellerProduct,
    archiveSellerProduct,
    activateSellerProduct,
    logEvent,
    getAuthToken,
    refreshSellerCredits,
  } = useAppState();
  const product = catalog.find((item) => item.id === id);
  const [draft, setDraft] = useState(() => createDraft(product));
  const [aiLoading, setAILoading] = useState<AIAction | undefined>();
  const [aiError, setAIError] = useState<string | undefined>();
  const [lastListing, setLastListing] = useState<GeneratedListing | undefined>();
  const [aiVariant, setAIVariant] = useState(0);
  const [visibilityBreakdown, setVisibilityBreakdown] = useState<VisibilityScoreBreakdown | undefined>();

  useEffect(() => {
    setDraft(createDraft(product));
    setLastListing(undefined);
    setVisibilityBreakdown(undefined);
  }, [product]);

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Ürün bulunamadı</Text>
          <Text style={styles.body}>Bu ürün katalogda veya satıcı ürünlerinde görünmüyor.</Text>
          <ActionButton label="Geri dön" icon={<ArrowLeft size={16} color={colors.surface} />} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const archived = product.status === 'archived';

  function save() {
    if (!product) return;

    updateSellerProduct(product.id, {
      title: draft.title.trim() || product.title,
      price: Number(draft.price) || product.price,
      stock: Number(draft.stock) || 0,
      description: draft.description.trim() || product.description,
      color: draft.color.trim() || product.color,
      fit: draft.fit.trim() || product.fit,
      category: draft.category.trim() as Category,
      sizes: splitList(draft.sizes),
      modesty: normalizeModesty(draft.modesty),
      season: draft.season,
      styleTags: draft.styleTags as StyleTag[],
      vibeTags: draft.vibeTags,
      occasionTags: draft.occasionTags as OccasionTag[],
      aiSearchIntents: draft.aiSearchIntents,
      visibilityScore: clampScore(Number(draft.visibilityScore) || product.visibilityScore),
    });
    router.back();
  }

  async function runAIAction(action: AIAction) {
    if (!product || !canManageSeller) return;

    setAILoading(action);
    setAIError(undefined);
    try {
      const nextVariant = aiVariant + 1;
      const result = await generateProductIntelligence({
        draft: toSellerDraft(product, draft),
        previousListing: lastListing,
        variant: nextVariant,
      }, {
        authToken: await getAuthToken(),
      });
      setAIVariant(nextVariant);
      setLastListing(result.listing);
      setVisibilityBreakdown(result.listing.visibilityScoreBreakdown);
      if (result.sellerCredits) {
        void refreshSellerCredits();
      }
      applyListing(result.listing, action);
      logEvent('seller_product_ai_improved', {
        productId: product.id,
        action,
        score: result.listing.visibilityScore,
        source: result.listing.aiSource,
      });
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI metadata üretilemedi.');
    } finally {
      setAILoading(undefined);
    }
  }

  function applyListing(listing: GeneratedListing, action: AIAction) {
    setDraft((current) => {
      if (action === 'search') {
        return {
          ...current,
          aiSearchIntents: listing.aiSearchIntents,
          visibilityScore: String(listing.visibilityScore),
        };
      }

      if (action === 'description') {
        return {
          ...current,
          description: listing.longDescription,
          visibilityScore: String(listing.visibilityScore),
        };
      }

      if (action === 'score') {
        return {
          ...current,
          visibilityScore: String(listing.visibilityScore),
        };
      }

      return {
        ...current,
        title: listing.title,
        description: listing.longDescription,
        color: listing.color,
        fit: listing.fit,
        category: listing.category,
        modesty: listing.modesty,
        season: listing.season,
        styleTags: listing.styleTags,
        vibeTags: listing.vibeTags,
        occasionTags: listing.occasionTags,
        aiSearchIntents: listing.aiSearchIntents,
        visibilityScore: String(listing.visibilityScore),
      };
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Ürün düzenle</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{archived ? 'Arşiv' : 'Aktif'} ürün</Text>
              <Text style={styles.title}>{product.title}</Text>
              <Text style={styles.body}>{formatPrice(product.price)} · Stok {product.stock} · AI {product.visibilityScore}/100</Text>
            </View>
            <Pressable
              style={styles.statusButton}
              onPress={() => (archived ? activateSellerProduct(product.id) : archiveSellerProduct(product.id))}
              disabled={!canManageSeller}
            >
              {archived ? <RotateCcw size={16} color={colors.ink} /> : <Archive size={16} color={colors.ink} />}
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>AI metadata araçları</Text>
              <Text style={styles.cardTitle}>Visibility skoru: {draft.visibilityScore || product.visibilityScore}/100</Text>
              <Text style={styles.body}>
                Ürün açıklaması, search intent ve metadata alanlarını AI öneri sistemine göre iyileştir.
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{draft.visibilityScore || product.visibilityScore}</Text>
            </View>
          </View>
          <VisibilityBreakdown breakdown={visibilityBreakdown ?? estimateVisibilityBreakdown(product, draft)} />
          {lastListing ? (
            <View style={styles.aiNote}>
              <Text style={styles.aiNoteTitle}>{lastListing.confidence.toUpperCase()} confidence · {lastListing.aiSource}</Text>
              <Text style={styles.body}>{lastListing.reasoning}</Text>
            </View>
          ) : null}
          {aiError ? <Text style={styles.errorText}>{aiError}</Text> : null}
          <View style={styles.aiGrid}>
            <AIActionButton
              label="AI metadata tamamla"
              icon={<WandSparkles size={15} color={colors.ai} />}
              loading={aiLoading === 'complete'}
              disabled={Boolean(aiLoading)}
              onPress={() => runAIAction('complete')}
            />
            <AIActionButton
              label="Search intent üret"
              icon={<Search size={15} color={colors.ai} />}
              loading={aiLoading === 'search'}
              disabled={Boolean(aiLoading)}
              onPress={() => runAIAction('search')}
            />
            <AIActionButton
              label="Açıklamayı iyileştir"
              icon={<FileText size={15} color={colors.ai} />}
              loading={aiLoading === 'description'}
              disabled={Boolean(aiLoading)}
              onPress={() => runAIAction('description')}
            />
            <AIActionButton
              label="Score hesapla"
              icon={<Gauge size={15} color={colors.ai} />}
              loading={aiLoading === 'score'}
              disabled={Boolean(aiLoading)}
              onPress={() => runAIAction('score')}
            />
          </View>
        </View>

        <View style={styles.card}>
          <LabeledInput label="Ürün adı" value={draft.title} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} />
          <View style={styles.twoColumn}>
            <LabeledInput label="Fiyat" value={draft.price} keyboardType="numeric" onChangeText={(price) => setDraft((current) => ({ ...current, price }))} />
            <LabeledInput label="Stok" value={draft.stock} keyboardType="numeric" onChangeText={(stock) => setDraft((current) => ({ ...current, stock }))} />
          </View>
          <LabeledInput label="Açıklama" value={draft.description} multiline onChangeText={(description) => setDraft((current) => ({ ...current, description }))} />
          <View style={styles.twoColumn}>
            <LabeledInput label="Renk" value={draft.color} onChangeText={(color) => setDraft((current) => ({ ...current, color }))} />
            <LabeledInput label="Fit" value={draft.fit} onChangeText={(fit) => setDraft((current) => ({ ...current, fit }))} />
          </View>
          <View style={styles.twoColumn}>
            <LabeledInput label="Kategori" value={draft.category} onChangeText={(category) => setDraft((current) => ({ ...current, category: category as Category }))} />
            <LabeledInput label="Bedenler" value={draft.sizes} onChangeText={(sizes) => setDraft((current) => ({ ...current, sizes }))} />
          </View>
          <View style={styles.twoColumn}>
            <LabeledInput label="Modesty" value={draft.modesty} onChangeText={(modesty) => setDraft((current) => ({ ...current, modesty: modesty as ModestyLevel }))} />
            <LabeledInput label="AI Visibility" value={draft.visibilityScore} keyboardType="numeric" onChangeText={(visibilityScore) => setDraft((current) => ({ ...current, visibilityScore }))} />
          </View>
          <TagEditor
            title="Season"
            values={draft.season}
            onChange={(season) => setDraft((current) => ({ ...current, season }))}
          />
          <TagEditor
            title="Style tags"
            values={draft.styleTags}
            onChange={(styleTags) => setDraft((current) => ({ ...current, styleTags: styleTags as StyleTag[] }))}
          />
          <TagEditor
            title="Vibe tags"
            values={draft.vibeTags}
            onChange={(vibeTags) => setDraft((current) => ({ ...current, vibeTags }))}
          />
          <TagEditor
            title="Occasion tags"
            values={draft.occasionTags}
            onChange={(occasionTags) => setDraft((current) => ({ ...current, occasionTags: occasionTags as OccasionTag[] }))}
          />
          <TagEditor
            title="Search intents"
            values={draft.aiSearchIntents}
            onChange={(aiSearchIntents) => setDraft((current) => ({ ...current, aiSearchIntents }))}
          />
          <ActionButton
            label="Değişiklikleri Kaydet"
            icon={<Save size={16} color={colors.surface} />}
            tone="commerce"
            onPress={save}
            disabled={!canManageSeller}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createDraft(product?: Product) {
  return {
    title: product?.title ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '',
    description: product?.description ?? '',
    color: product?.color ?? '',
    fit: product?.fit ?? '',
    category: product?.category ?? 'dress',
    sizes: product?.sizes.join(', ') ?? '',
    modesty: product?.modesty ?? 'medium',
    season: product?.season ?? [],
    styleTags: product?.styleTags ?? [],
    vibeTags: product?.vibeTags ?? [],
    occasionTags: product?.occasionTags ?? [],
    aiSearchIntents: product?.aiSearchIntents ?? [],
    visibilityScore: product ? String(product.visibilityScore) : '',
  };
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSellerDraft(product: Product, draft: ReturnType<typeof createDraft>): SellerDraft {
  return {
    imageUrl: product.imageUrl,
    price: draft.price,
    stock: draft.stock,
    sizes: draft.sizes,
    optionalName: draft.title,
    optionalCategory: draft.category,
  };
}

function normalizeModesty(value: string): ModestyLevel {
  if (value === 'low' || value === 'medium' || value === 'medium-high' || value === 'high') return value;
  return 'medium';
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function estimateVisibilityBreakdown(product: Product, draft: ReturnType<typeof createDraft>): VisibilityScoreBreakdown {
  const searchDepth = draft.aiSearchIntents.length + draft.styleTags.length + draft.vibeTags.length + draft.occasionTags.length;
  return {
    image: product.imageUrl ? 16 : 0,
    price: Number(draft.price) > 0 ? 12 : 0,
    stock: Number(draft.stock) > 0 ? 10 : 0,
    sizes: splitList(draft.sizes).length > 0 ? 10 : 0,
    category: draft.category ? 12 : 0,
    naming: draft.title.trim().length > 8 ? 12 : 5,
    metadataDepth: Math.min(26, 8 + searchDepth * 2),
  };
}

function VisibilityBreakdown({ breakdown }: { breakdown: VisibilityScoreBreakdown }) {
  return (
    <View style={styles.breakdownGrid}>
      {Object.entries(breakdown).map(([label, value]) => (
        <View key={label} style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>{label}</Text>
          <Text style={styles.breakdownValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function AIActionButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.aiButton, disabled && styles.aiButtonDisabled]} onPress={disabled ? undefined : onPress}>
      {loading ? <ActivityIndicator size="small" color={colors.ai} /> : icon}
      <Text style={styles.aiButtonText}>{label}</Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 16,
  },
  heroImage: {
    width: '100%',
    height: 260,
    borderRadius: 26,
    backgroundColor: colors.surfaceSubtle,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 15,
    gap: 13,
  },
  emptyState: {
    flex: 1,
    padding: 22,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  eyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  statusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: colors.ai,
    fontSize: 18,
    fontWeight: '900',
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownItem: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    padding: 9,
    gap: 3,
  },
  breakdownLabel: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  breakdownValue: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  aiNote: {
    borderRadius: 18,
    backgroundColor: colors.aiSoft,
    padding: 10,
    gap: 4,
  },
  aiNoteTitle: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  aiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiButton: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  aiButtonDisabled: {
    opacity: 0.55,
  },
  aiButtonText: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '900',
  },
  twoColumn: {
    gap: 10,
  },
  inputGroup: {
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
});
