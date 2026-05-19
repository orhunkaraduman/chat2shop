import { router } from 'expo-router';
import { Archive, Edit3, Eye, ImageOff, PackagePlus, RotateCcw, Sparkles, Trash2, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  SellerEmptyState,
  SellerListCard,
  SellerMetricTile,
  SellerProgressBar,
  SellerScreenShell,
  SellerSection,
  SellerStatusPill,
} from '@/components/seller/SellerUI';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { Product } from '@/types';

const filters = ['Tümü', 'Aktif', 'Düşük stok', 'AI skoru düşük', 'Arşiv'] as const;
type ProductFilter = (typeof filters)[number];

export default function SellerProductsScreen() {
  const {
    canManageSeller,
    sellerProducts,
    archiveSellerProduct,
    activateSellerProduct,
    deleteSellerProduct,
  } = useAppState();
  const activeProducts = sellerProducts.filter((product) => (product.status ?? 'active') === 'active');
  const archivedProducts = sellerProducts.filter((product) => product.status === 'archived');
  const lowStockProducts = sellerProducts.filter((product) => product.stock <= 5);
  const lowVisibilityProducts = sellerProducts.filter((product) => product.visibilityScore < 80);
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter>('Tümü');

  const visibleProducts = sellerProducts.filter((product) => {
    if (selectedFilter === 'Aktif') return (product.status ?? 'active') === 'active';
    if (selectedFilter === 'Arşiv') return product.status === 'archived';
    if (selectedFilter === 'Düşük stok') return product.stock <= 5;
    if (selectedFilter === 'AI skoru düşük') return product.visibilityScore < 80;
    return true;
  });

  return (
    <SellerScreenShell
      eyebrow="Katalog operasyonu"
      title="Ürünler"
      subtitle="Yayın durumunu, stok riskini ve AI görünürlüğünü tek yerden yönet."
      action={
        <Pressable style={styles.headerAction} onPress={() => router.push('/seller')} disabled={!canManageSeller}>
          <PackagePlus size={16} color={colors.surface} />
        </Pressable>
      }
    >
      <View style={styles.metricGrid}>
        <SellerMetricTile label="Aktif" value={String(activeProducts.length)} icon={<Eye size={15} color={colors.trust} />} tone="trust" />
        <SellerMetricTile label="Arşiv" value={String(archivedProducts.length)} icon={<Archive size={15} color={colors.mutedSoft} />} />
        <SellerMetricTile label="Düşük stok" value={String(lowStockProducts.length)} icon={<TriangleAlert size={15} color={colors.warningStrong} />} tone="warning" />
        <SellerMetricTile label="AI skoru düşük" value={String(lowVisibilityProducts.length)} icon={<Sparkles size={15} color={colors.ai} />} tone="ai" />
      </View>

      <SellerSection
        title="Ürün listesi"
        subtitle="Filtrele, düzenle ve yayından kaldırma işlemlerini yönet."
        action={
          <Pressable style={styles.addButton} onPress={() => router.push('/seller')} disabled={!canManageSeller}>
            <Text style={styles.addButtonText}>AI ile ekle</Text>
          </Pressable>
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {filters.map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {visibleProducts.length === 0 ? (
          <SellerEmptyState
            title={sellerProducts.length === 0 ? 'Henüz ürün yok' : 'Bu filtrede ürün yok'}
            body={sellerProducts.length === 0 ? 'İlk ürününü AI ile oluşturup katalogda yayınlayabilirsin.' : 'Başka filtre seçerek ürünleri görüntüleyebilirsin.'}
            actionLabel={sellerProducts.length === 0 ? 'AI ile ürün ekle' : undefined}
            onAction={sellerProducts.length === 0 ? () => router.push('/seller') : undefined}
          />
        ) : (
          visibleProducts.map((product) => (
            <ProductManagementCard
              key={product.id}
              product={product}
              onEdit={() => router.push({ pathname: '/seller-product/[id]', params: { id: product.id } })}
              onToggleStatus={() =>
                product.status === 'archived'
                  ? activateSellerProduct(product.id)
                  : archiveSellerProduct(product.id)
              }
              onDelete={() =>
                Alert.alert(
                  'Ürünü sil',
                  'Bu arşivli ürün kalıcı olarak silinecek. Bu işlem geri alınamaz.',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => {
                        void deleteSellerProduct(product.id);
                      },
                    },
                  ],
                )
              }
              disabled={!canManageSeller}
            />
          ))
        )}
      </SellerSection>
    </SellerScreenShell>
  );
}

function ProductManagementCard({
  product,
  onEdit,
  onToggleStatus,
  onDelete,
  disabled,
}: {
  product: Product;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const archived = product.status === 'archived';
  const lowStock = product.stock <= 5;
  const lowVisibility = product.visibilityScore < 80;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <SellerListCard>
      <View style={styles.productRow}>
        {imageFailed || !product.imageUrl ? (
          <View style={styles.productImageFallback}>
            <ImageOff size={22} color={colors.mutedSoft} />
          </View>
        ) : (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        )}
        <View style={styles.productBody}>
          <View style={styles.productTop}>
            <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
            <SellerStatusPill label={archived ? 'Arşiv' : 'Aktif'} tone={archived ? 'neutral' : 'success'} />
          </View>
          <Text style={styles.productMeta}>{formatPrice(product.price)} · Stok {product.stock} · {product.category}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>AI visibility {product.visibilityScore}/100</Text>
            <Text style={styles.scoreText}>{product.color}</Text>
          </View>
          <SellerProgressBar value={product.visibilityScore} tone={lowVisibility ? 'warning' : 'ai'} />
          <View style={styles.pillRow}>
            {lowStock ? <SellerStatusPill label="Stok düşük" tone="warning" /> : null}
            {lowVisibility ? <SellerStatusPill label="Metadata eksik" tone="warning" /> : null}
          </View>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryAction} onPress={onEdit}>
          <Edit3 size={15} color={colors.inkStrong} />
          <Text style={styles.secondaryActionText}>Düzenle</Text>
        </Pressable>
        <Pressable style={[styles.secondaryAction, disabled && styles.disabled]} onPress={disabled ? undefined : onToggleStatus}>
          {archived ? <RotateCcw size={15} color={colors.inkStrong} /> : <Archive size={15} color={colors.inkStrong} />}
          <Text style={styles.secondaryActionText}>{archived ? 'Yayına al' : 'Arşivle'}</Text>
        </Pressable>
        {archived ? (
          <Pressable style={[styles.secondaryAction, styles.deleteAction, disabled && styles.disabled]} onPress={disabled ? undefined : onDelete}>
            <Trash2 size={15} color={colors.danger} />
            <Text style={[styles.secondaryActionText, styles.deleteActionText]}>Sil</Text>
          </Pressable>
        ) : null}
      </View>
    </SellerListCard>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.commerce,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  filterRail: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  filterText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: colors.info,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 84,
    height: 108,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  productImageFallback: {
    width: 84,
    height: 108,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    flex: 1,
    gap: 7,
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  productTitle: {
    flex: 1,
    color: colors.inkStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  productMeta: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scoreText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  secondaryActionText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteAction: {
    backgroundColor: colors.dangerSoft,
  },
  deleteActionText: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.48,
  },
});
