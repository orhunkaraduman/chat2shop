import { router } from 'expo-router';
import { ClipboardList, PackageCheck, ReceiptText, RotateCcw, Truck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  SellerListCard,
  SellerMetricTile,
  SellerEmptyState,
  SellerScreenShell,
  SellerSection,
  SellerStatusPill,
} from '@/components/seller/SellerUI';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { SellerOrder, SellerOrderStatus } from '@/types';

const filters = ['Tümü', 'Yeni', 'Hazırlanıyor', 'Kargoda', 'Sorunlu'] as const;
type OrderFilter = (typeof filters)[number];
type StatusTone = 'neutral' | 'brand' | 'ai' | 'success' | 'warning' | 'danger';

export default function SellerOrdersScreen() {
  const { sellerOrders, updateSellerOrderStatus, getReturnRequestsForSellerOrder, repositoryMode } = useAppState();
  const displayOrders = sellerOrders.length > 0 || repositoryMode === 'firebase' ? sellerOrders : mockSellerOrders();
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>('Tümü');
  const pendingCount = displayOrders.filter((order) => order.status !== 'completed').length;
  const shippedCount = displayOrders.filter((order) => order.status === 'shipped').length;
  const completedCount = displayOrders.filter((order) => order.status === 'completed').length;
  const totalRevenue = displayOrders.reduce((total, order) => total + order.total, 0);
  const returnQueueCount = displayOrders.reduce(
    (total, order) => total + getReturnRequestsForSellerOrder(order.id).filter((request) => request.status === 'requested').length,
    0,
  );
  const visibleOrders = displayOrders.filter((order) => {
    if (selectedFilter === 'Yeni') return order.status === 'new';
    if (selectedFilter === 'Hazırlanıyor') return order.status === 'preparing';
    if (selectedFilter === 'Kargoda') return order.status === 'shipped';
    if (selectedFilter === 'Sorunlu') return order.status === 'issue';
    return true;
  });

  return (
    <SellerScreenShell
      eyebrow="Sipariş kuyruğu"
      title="Siparişler"
      subtitle="Satışları, hazırlık durumunu, kargo bilgisini ve iade kuyruğunu takip et."
    >
      <View style={styles.metricGrid}>
        <SellerMetricTile label="Toplam" value={String(displayOrders.length)} icon={<ReceiptText size={15} color={colors.info} />} tone="info" />
        <SellerMetricTile label="Bekleyen" value={String(pendingCount)} icon={<RotateCcw size={15} color={colors.warningStrong} />} tone="warning" />
        <SellerMetricTile label="Kargoda" value={String(shippedCount)} icon={<Truck size={15} color={colors.info} />} tone="info" />
        <SellerMetricTile label="Tamamlandı" value={String(completedCount)} icon={<PackageCheck size={15} color={colors.trust} />} tone="trust" />
        <SellerMetricTile label="İade kuyruğu" value={String(returnQueueCount)} icon={<Undo2 size={15} color={colors.danger} />} tone="danger" />
        <SellerMetricTile label="Ciro" value={formatPrice(totalRevenue)} helper="Mock ödeme dahil" icon={<ReceiptText size={15} color={colors.inkSoft} />} />
      </View>

      <SellerSection
        title="Operasyon listesi"
        subtitle={sellerOrders.length > 0 ? 'Checkout akışından gelen satıcı siparişleri.' : 'Henüz işlem bekleyen sipariş yok.'}
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

        {visibleOrders.length === 0 ? (
          <SellerEmptyState
            title="Sipariş yok"
            body="Yeni satışlar geldiğinde hazırlık, kargo ve iade durumlarını burada yöneteceksin."
          />
        ) : (
          visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              demo={sellerOrders.length === 0 && repositoryMode === 'local'}
              returnCount={getReturnRequestsForSellerOrder(order.id).length}
              onOpenDetail={() => router.push({ pathname: '/seller-order/[id]', params: { id: order.id } })}
              onNextStatus={() => updateSellerOrderStatus(order.id, getNextStatus(order.status))}
            />
          ))
        )}
      </SellerSection>
    </SellerScreenShell>
  );
}

function OrderCard({
  order,
  demo,
  returnCount,
  onOpenDetail,
  onNextStatus,
}: {
  order: SellerOrder;
  demo: boolean;
  returnCount: number;
  onOpenDetail: () => void;
  onNextStatus: () => void;
}) {
  const done = order.status === 'completed';
  const issue = order.status === 'issue';
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <SellerListCard>
      <View style={styles.orderTop}>
        <View style={styles.flex}>
          <Text style={styles.orderId}>{order.id}</Text>
          <Text style={styles.orderMeta}>
            {order.buyerEmail ?? 'Demo müşteri'} · {itemCount} ürün · {new Date(order.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <SellerStatusPill label={statusLabel(order.status)} tone={statusTone(order.status)} />
      </View>

      <View style={styles.orderMiddle}>
        <View>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
        </View>
        <View style={styles.orderSignals}>
          {returnCount > 0 ? <SellerStatusPill label={`${returnCount} iade`} tone="danger" /> : null}
          {demo ? <SellerStatusPill label="Örnek kayıt" /> : null}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={onOpenDetail}>
          <ClipboardList size={15} color={colors.inkStrong} />
          <Text style={styles.actionText}>Detay</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, (demo || done || issue) && styles.disabledAction]}
          onPress={demo || done || issue ? undefined : onNextStatus}
        >
          {done ? <PackageCheck size={15} color={colors.inkStrong} /> : <Truck size={15} color={colors.inkStrong} />}
          <Text style={styles.actionText}>{done ? 'Tamamlandı' : 'Sonraki durum'}</Text>
        </Pressable>
      </View>
    </SellerListCard>
  );
}

function mockSellerOrders(): SellerOrder[] {
  const now = new Date().toISOString();
  return [
    createMockOrder('ORD-MOCK-1024', 'new', 2349, 1, now),
    createMockOrder('ORD-MOCK-1023', 'preparing', 5570, 4, now),
    createMockOrder('ORD-MOCK-1022', 'completed', 1890, 1, now),
  ];
}

function createMockOrder(
  id: string,
  status: SellerOrderStatus,
  total: number,
  quantity: number,
  createdAt: string,
): SellerOrder {
  return {
    id,
    sellerId: 'demo-seller',
    buyerEmail: 'demo@chat2shop.dev',
    buyerOrderId: id,
    items: [
      {
        productId: 'demo-product',
        title: 'Demo ürün',
        imageUrl: '',
        size: 'M',
        color: 'Siyah',
        quantity,
        unitPrice: total / quantity,
        total,
      },
    ],
    subtotal: total,
    shipping: 0,
    total,
    status,
    addressLabel: 'Demo adres',
    paymentLabel: 'Mock card',
    createdAt,
    updatedAt: createdAt,
  };
}

function statusLabel(status: SellerOrderStatus) {
  if (status === 'new') return 'Yeni';
  if (status === 'preparing') return 'Hazırlanıyor';
  if (status === 'shipped') return 'Kargoda';
  if (status === 'completed') return 'Tamamlandı';
  return 'Sorunlu';
}

function statusTone(status: SellerOrderStatus): StatusTone {
  if (status === 'completed') return 'success';
  if (status === 'shipped') return 'ai';
  if (status === 'issue') return 'danger';
  if (status === 'preparing') return 'warning';
  return 'brand';
}

function getNextStatus(status: SellerOrderStatus): SellerOrderStatus {
  if (status === 'new') return 'preparing';
  if (status === 'preparing') return 'shipped';
  if (status === 'shipped') return 'completed';
  return status;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  filterText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: colors.brand,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderId: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: '900',
  },
  orderMeta: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 3,
  },
  orderMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderSignals: {
    flexDirection: 'row',
    gap: 7,
  },
  totalLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  totalValue: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  actionText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledAction: {
    opacity: 0.48,
  },
});
