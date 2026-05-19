import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, PackageCheck, ReceiptText, RotateCcw, Truck } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { BuyerOrderTimelineItem, Order, Product, ReturnRequest, SellerOrder, SellerOrderStatus } from '@/types';

const returnReasons = ['Beden uymadı', 'Beklediğim gibi durmadı', 'Yanlış ürün', 'Kusurlu ürün'];

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    orders,
    catalog,
    getSellerOrdersForBuyerOrder,
    loadBuyerSellerOrders,
    getReturnRequestsForBuyerOrder,
    submitReturnRequest,
    logEvent,
  } = useAppState();
  const order = orders.find((item) => item.id === id);
  const sellerOrders = order ? getSellerOrdersForBuyerOrder(order.id) : [];
  const returnRequests = order ? getReturnRequestsForBuyerOrder(order.id) : [];
  const [activeReturnKey, setActiveReturnKey] = useState<string | undefined>();
  const [returnReason, setReturnReason] = useState(returnReasons[0]);
  const [returnNote, setReturnNote] = useState('');

  useEffect(() => {
    if (!order) return;
    logEvent('buyer_order_detail_opened', { orderId: order.id });
    void loadBuyerSellerOrders();
  }, [order?.id]);

  const timeline = useMemo(
    () => (order ? buildBuyerTimeline(order, sellerOrders, returnRequests) : []),
    [order, returnRequests, sellerOrders],
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Sipariş bulunamadı</Text>
          <Text style={styles.body}>Bu sipariş geçmişinde görünmüyor.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Geri dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Sipariş detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Sipariş</Text>
          <Text style={styles.title}>{order.id}</Text>
          <Text style={styles.body}>{new Date(order.createdAt).toLocaleString('tr-TR')}</Text>
          <View style={styles.summaryPill}>
            <PackageCheck size={14} color={colors.green} />
            <Text style={styles.summaryText}>{order.statusSummary?.label ?? 'Hazırlık bilgisi bekleniyor'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fulfillment timeline</Text>
          <View style={styles.timeline}>
            {timeline.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ürünler</Text>
          {order.items.map((item) => {
            const product = catalog.find((catalogItem) => catalogItem.id === item.productId);
            const sellerOrder = sellerOrders.find((sellerItem) =>
              sellerItem.items.some((orderItem) => orderItem.productId === item.productId && orderItem.size === item.size),
            );
            const orderReturnRequests = returnRequests.filter(
              (request) => request.productId === item.productId && request.size === item.size,
            );
            const returnKey = `${item.productId}-${item.size}`;
            return (
              <OrderItemRow
                key={returnKey}
                order={order}
                product={product}
                productId={item.productId}
                size={item.size}
                quantity={item.quantity}
                sellerOrder={sellerOrder}
                returnRequests={orderReturnRequests}
                returnOpen={activeReturnKey === returnKey}
                onOpenReturn={() => setActiveReturnKey((current) => (current === returnKey ? undefined : returnKey))}
                onSubmitReturn={() => {
                  submitReturnRequest({
                    buyerOrderId: order.id,
                    productId: item.productId,
                    size: item.size,
                    quantity: item.quantity,
                    reason: returnReason,
                    note: returnNote,
                  });
                  setReturnNote('');
                  setActiveReturnKey(undefined);
                }}
                returnReason={returnReason}
                onReturnReasonChange={setReturnReason}
                returnNote={returnNote}
                onReturnNoteChange={setReturnNote}
              />
            );
          })}
        </View>

        <View style={styles.infoGrid}>
          <InfoCard icon={<MapPin size={17} color={colors.green} />} title="Adres" value={order.addressLabel} />
          <InfoCard icon={<ReceiptText size={17} color={colors.info} />} title="Ödeme" value={order.paymentLabel} />
          <InfoCard icon={<Truck size={17} color={colors.blue} />} title="Teslimat" value={`${order.deliveryLabel} · ${order.deliveryEta}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tutar özeti</Text>
          <PriceRow label="Ara toplam" value={order.subtotal} />
          <PriceRow label="Teslimat" value={order.shipping} />
          <View style={styles.divider} />
          <PriceRow label="Toplam" value={order.total} strong />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderItemRow({
  product,
  productId,
  size,
  quantity,
  sellerOrder,
  returnRequests,
  returnOpen,
  onOpenReturn,
  onSubmitReturn,
  returnReason,
  onReturnReasonChange,
  returnNote,
  onReturnNoteChange,
}: {
  order: Order;
  product?: Product;
  productId: string;
  size: string;
  quantity: number;
  sellerOrder?: SellerOrder;
  returnRequests: ReturnRequest[];
  returnOpen: boolean;
  onOpenReturn: () => void;
  onSubmitReturn: () => void;
  returnReason: string;
  onReturnReasonChange: (value: string) => void;
  returnNote: string;
  onReturnNoteChange: (value: string) => void;
}) {
  const sellerItem = sellerOrder?.items.find((item) => item.productId === productId);
  const title = product?.title ?? sellerItem?.title ?? productId;
  const imageUrl = product?.imageUrl ?? sellerItem?.imageUrl;
  const unitPrice = product?.price ?? sellerItem?.unitPrice ?? 0;
  const total = unitPrice * quantity;

  return (
    <View style={styles.itemBlock}>
      <View style={styles.itemRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <ReceiptText size={18} color={colors.muted} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.body}>Beden {size} · {quantity} adet</Text>
          <StatusPill status={sellerOrder?.status ?? 'new'} />
          {sellerOrder?.trackingNumber ? (
            <Text style={styles.metaText}>
              {sellerOrder.carrierLabel ?? 'Kargo'} · {sellerOrder.trackingNumber}
            </Text>
          ) : null}
        </View>
        <Text style={styles.itemTotal}>{formatPrice(total)}</Text>
      </View>

      {returnRequests.length > 0 ? (
        <View style={styles.requestList}>
          {returnRequests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.requestLabel}>{request.reason}</Text>
              <Text style={styles.requestStatus}>{returnStatusLabel(request.status)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.returnToggle} onPress={onOpenReturn}>
        <RotateCcw size={14} color={colors.commerce} />
        <Text style={styles.returnToggleText}>{returnOpen ? 'İade formunu kapat' : 'İade talebi oluştur'}</Text>
      </Pressable>

      {returnOpen ? (
        <View style={styles.returnForm}>
          <Text style={styles.formTitle}>İade nedeni</Text>
          <View style={styles.reasonRow}>
            {returnReasons.map((reason) => (
              <Pressable
                key={reason}
                style={[styles.reasonChip, reason === returnReason && styles.reasonChipActive]}
                onPress={() => onReturnReasonChange(reason)}
              >
                <Text style={[styles.reasonChipText, reason === returnReason && styles.reasonChipTextActive]}>
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={returnNote}
            onChangeText={onReturnNoteChange}
            placeholder="Kısa not ekle"
            placeholderTextColor={colors.muted}
            style={styles.returnInput}
            multiline
          />
          <Pressable style={styles.returnSubmit} onPress={onSubmitReturn}>
            <Text style={styles.returnSubmitText}>Talebi gönder</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function TimelineItem({ item }: { item: BuyerOrderTimelineItem }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <View style={styles.flex}>
        <Text style={styles.timelineLabel}>{item.label}</Text>
        <Text style={styles.body}>{item.description}</Text>
        <Text style={styles.timelineMeta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
      </View>
    </View>
  );
}

function StatusPill({ status }: { status: SellerOrderStatus }) {
  return (
    <View style={[styles.statusPill, status === 'completed' && styles.statusDone, status === 'issue' && styles.statusIssue]}>
      <Text style={[styles.statusText, status === 'completed' && styles.statusDoneText]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function InfoCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      {icon}
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, strong && styles.priceStrong]}>{label}</Text>
      <Text style={[styles.priceValue, strong && styles.priceStrong]}>{formatPrice(value)}</Text>
    </View>
  );
}

function statusLabel(status: SellerOrderStatus) {
  if (status === 'new') return 'Yeni';
  if (status === 'preparing') return 'Hazırlanıyor';
  if (status === 'shipped') return 'Kargoda';
  if (status === 'completed') return 'Tamamlandı';
  return 'Sorunlu';
}

function returnStatusLabel(status: ReturnRequest['status']) {
  if (status === 'requested') return 'İncelemede';
  if (status === 'approved') return 'Onaylandı';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'received') return 'Ürün ulaştı';
  return 'İade tamamlandı';
}

function buildBuyerTimeline(
  order: Order,
  sellerOrders: SellerOrder[],
  returnRequests: ReturnRequest[],
): BuyerOrderTimelineItem[] {
  const placed: BuyerOrderTimelineItem[] = [
    {
      id: `${order.id}-placed`,
      status: 'placed',
      label: 'Sipariş alındı',
      description: `${order.deliveryLabel} seçildi. Tahmini teslimat ${order.deliveryEta}.`,
      createdAt: order.createdAt,
    },
  ];
  const fulfillment = sellerOrders.flatMap((sellerOrder) =>
    (sellerOrder.statusHistory ?? []).map((item) => ({
      id: `${sellerOrder.id}-${item.status}`,
      status: item.status,
      label: item.label,
      description: item.description,
      createdAt: item.createdAt,
      sellerOrderId: sellerOrder.id,
    })),
  );
  const returns = returnRequests.map((request) => ({
    id: request.id,
    status: mapReturnStatusToTimelineStatus(request.status),
    label: `İade · ${returnStatusLabel(request.status)}`,
    description: `${request.productTitle} için ${request.reason}`,
    createdAt: request.updatedAt,
    sellerOrderId: request.sellerOrderId,
    returnRequestId: request.id,
  }));
  return [...placed, ...fulfillment, ...returns].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function mapReturnStatusToTimelineStatus(status: ReturnRequest['status']): BuyerOrderTimelineItem['status'] {
  if (status === 'requested') return 'return-requested';
  if (status === 'approved') return 'return-approved';
  if (status === 'rejected') return 'return-rejected';
  if (status === 'received') return 'return-received';
  return 'refunded-mock';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    paddingBottom: 34,
    gap: 14,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    padding: 22,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.commerce,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryPill: {
    minHeight: 30,
    alignSelf: 'flex-start',
    borderRadius: 15,
    backgroundColor: colors.tile,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  timeline: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.commerce,
    marginTop: 5,
  },
  timelineLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  timelineMeta: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  itemBlock: {
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemImage: {
    width: 64,
    height: 78,
    borderRadius: 10,
    backgroundColor: colors.tile,
  },
  itemImagePlaceholder: {
    width: 64,
    height: 78,
    borderRadius: 10,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  itemTotal: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  statusPill: {
    minHeight: 26,
    alignSelf: 'flex-start',
    borderRadius: 13,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  statusDone: {
    backgroundColor: colors.softGreen,
  },
  statusIssue: {
    backgroundColor: colors.warning,
  },
  statusText: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '900',
  },
  statusDoneText: {
    color: colors.green,
  },
  metaText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
  },
  requestList: {
    gap: 6,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.tile,
  },
  requestLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  requestStatus: {
    color: colors.commerce,
    fontSize: 11,
    fontWeight: '900',
  },
  returnToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  returnToggleText: {
    color: colors.commerce,
    fontSize: 11,
    fontWeight: '900',
  },
  returnForm: {
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    gap: 10,
  },
  formTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonChipActive: {
    backgroundColor: colors.commerce,
  },
  reasonChipText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  reasonChipTextActive: {
    color: colors.surface,
  },
  returnInput: {
    minHeight: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    color: colors.ink,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  returnSubmit: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnSubmitText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: colors.tile,
    padding: 12,
    gap: 5,
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  infoValue: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  priceValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  priceStrong: {
    color: colors.ink,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  flex: {
    flex: 1,
  },
});
