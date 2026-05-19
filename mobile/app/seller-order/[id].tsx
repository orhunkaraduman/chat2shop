import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CircleAlert, ClipboardList, MapPin, PackageCheck, ReceiptText, Truck } from 'lucide-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { ReturnRequest, SellerOrder, SellerOrderStatus } from '@/types';

const statusFlow: SellerOrderStatus[] = ['new', 'preparing', 'shipped', 'completed'];

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    sellerOrders,
    updateSellerOrderStatus,
    updateSellerOrderFulfillment,
    getReturnRequestsForSellerOrder,
    updateReturnRequestStatus,
    logEvent,
    repositoryMode,
  } = useAppState();
  const existingOrder = sellerOrders.find((item) => item.id === id);
  const order = existingOrder ?? (repositoryMode === 'local' ? createDemoOrder(id) : undefined);
  const isDemo = !existingOrder && repositoryMode === 'local';
  const returnRequests = order ? getReturnRequestsForSellerOrder(order.id) : [];
  const nextStatus = order ? getNextStatus(order.status) : 'new';
  const [carrierLabel, setCarrierLabel] = useState(order?.carrierLabel ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber ?? '');
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (order) {
      logEvent('seller_order_detail_opened', { orderId: order.id, demo: isDemo });
    }
  }, [order?.id, isDemo]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Sipariş detayı</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
        <View style={styles.notFoundCard}>
          <Text style={styles.cardTitle}>Sipariş bulunamadı</Text>
          <Text style={styles.body}>Bu sipariş kaydı artık mevcut değil veya bu hesapla görüntülenemiyor.</Text>
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
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{isDemo ? 'Demo sipariş' : 'Canlı seller order'}</Text>
              <Text style={styles.title}>{order.id}</Text>
              <Text style={styles.body}>{order.buyerEmail ?? 'Demo müşteri'} · Buyer order {order.buyerOrderId}</Text>
            </View>
            <StatusPill status={order.status} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Durum akışı</Text>
          <View style={styles.timeline}>
            {statusFlow.map((status) => (
              <View key={status} style={styles.timelineItem}>
                <View style={[styles.timelineDot, isStatusReached(order.status, status) && styles.timelineDotActive]} />
                <Text style={[styles.timelineText, isStatusReached(order.status, status) && styles.timelineTextActive]}>
                  {statusLabel(status)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.actionGrid}>
            <ActionButton
              label={order.status === 'completed' ? 'Tamamlandı' : `Sonraki: ${statusLabel(nextStatus)}`}
              icon={order.status === 'completed' ? <PackageCheck size={16} color={colors.surface} /> : <Truck size={16} color={colors.surface} />}
              onPress={() => updateSellerOrderStatus(order.id, nextStatus)}
              disabled={isDemo || order.status === 'completed' || order.status === 'issue'}
            />
            <ActionButton
              label="Sorun işaretle"
              variant="secondary"
              icon={<CircleAlert size={16} color={colors.ink} />}
              onPress={() => updateSellerOrderStatus(order.id, 'issue')}
              disabled={isDemo || order.status === 'issue'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kargo bilgisi</Text>
          <TextInput
            value={carrierLabel}
            onChangeText={setCarrierLabel}
            placeholder="Yurtiçi / MNG / Mağaza teslim"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="Takip numarası"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            style={styles.primaryButton}
            disabled={isDemo}
            onPress={() => updateSellerOrderFulfillment(order.id, { carrierLabel, trackingNumber })}
          >
            <Text style={styles.primaryButtonText}>Kargo bilgisini kaydet</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ürünler</Text>
          {order.items.map((item) => (
            <View key={`${item.productId}-${item.size}`} style={styles.itemRow}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <ReceiptText size={18} color={colors.muted} />
                </View>
              )}
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.body}>{item.size} · {item.color} · {item.quantity} adet</Text>
                <Text style={styles.body}>{formatPrice(item.unitPrice)} / ürün</Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>İade talepleri</Text>
          {returnRequests.length === 0 ? (
            <Text style={styles.body}>Bu sipariş için açık iade talebi yok.</Text>
          ) : (
            returnRequests.map((request) => (
              <ReturnRequestCard
                key={request.id}
                request={request}
                decisionNote={decisionNotes[request.id] ?? ''}
                onDecisionNoteChange={(value) =>
                  setDecisionNotes((current) => ({ ...current, [request.id]: value }))
                }
                onUpdateStatus={(status) => updateReturnRequestStatus(request.id, status, decisionNotes[request.id])}
              />
            ))
          )}
        </View>

        <View style={styles.infoGrid}>
          <InfoCard icon={<MapPin size={17} color={colors.green} />} title="Adres" value={order.addressLabel} />
          <InfoCard icon={<ReceiptText size={17} color={colors.info} />} title="Ödeme" value={order.paymentLabel} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tutar özeti</Text>
          <PriceRow label="Ara toplam" value={order.subtotal} />
          <PriceRow label="Kargo" value={order.shipping} />
          <View style={styles.divider} />
          <PriceRow label="Toplam" value={order.total} strong />
          <Text style={styles.body}>Oluşturulma: {new Date(order.createdAt).toLocaleString('tr-TR')}</Text>
          <Text style={styles.body}>Son güncelleme: {new Date(order.updatedAt).toLocaleString('tr-TR')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReturnRequestCard({
  request,
  decisionNote,
  onDecisionNoteChange,
  onUpdateStatus,
}: {
  request: ReturnRequest;
  decisionNote: string;
  onDecisionNoteChange: (value: string) => void;
  onUpdateStatus: (status: ReturnRequest['status']) => void;
}) {
  return (
    <View style={styles.returnCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.returnTitle}>{request.productTitle}</Text>
          <Text style={styles.body}>{request.reason}</Text>
          {request.note ? <Text style={styles.body}>Not: {request.note}</Text> : null}
        </View>
        <Text style={styles.returnStatus}>{returnStatusLabel(request.status)}</Text>
      </View>
      <TextInput
        value={decisionNote}
        onChangeText={onDecisionNoteChange}
        placeholder="Karar notu"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <View style={styles.returnActions}>
        <MiniAction label="Onayla" onPress={() => onUpdateStatus('approved')} />
        <MiniAction label="Reddet" onPress={() => onUpdateStatus('rejected')} />
        <MiniAction label="Ulaştı" onPress={() => onUpdateStatus('received')} />
        <MiniAction label="Refund" onPress={() => onUpdateStatus('refunded-mock')} />
      </View>
    </View>
  );
}

function MiniAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.miniAction} onPress={onPress}>
      <Text style={styles.miniActionText}>{label}</Text>
    </Pressable>
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

function StatusPill({ status }: { status: SellerOrderStatus }) {
  const issue = status === 'issue';
  const done = status === 'completed';
  return (
    <View style={[styles.statusPill, done && styles.statusDone, issue && styles.statusIssue]}>
      <Text style={[styles.statusText, done && styles.statusDoneText, issue && styles.statusIssueText]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function getNextStatus(status: SellerOrderStatus): SellerOrderStatus {
  if (status === 'new') return 'preparing';
  if (status === 'preparing') return 'shipped';
  if (status === 'shipped') return 'completed';
  return status;
}

function isStatusReached(current: SellerOrderStatus, status: SellerOrderStatus) {
  if (current === 'issue') return false;
  return statusFlow.indexOf(status) <= statusFlow.indexOf(current);
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

function createDemoOrder(id?: string): SellerOrder {
  const now = new Date().toISOString();
  return {
    id: id || 'ORD-MOCK-1024',
    sellerId: 'demo-seller',
    buyerEmail: 'demo@chat2shop.dev',
    buyerOrderId: id || 'ORD-MOCK-1024',
    items: [
      {
        productId: 'demo-product',
        title: 'Demo ürün',
        imageUrl: '',
        size: 'M',
        color: 'Siyah',
        quantity: 1,
        unitPrice: 2349,
        total: 2349,
      },
    ],
    subtotal: 2349,
    shipping: 0,
    total: 2349,
    status: 'new',
    addressLabel: 'Demo adres',
    paymentLabel: 'Mock card',
    deliveryLabel: 'Standart teslimat',
    deliveryEta: '2-4 iş günü',
    carrierLabel: '',
    trackingNumber: '',
    statusHistory: [],
    createdAt: now,
    updatedAt: now,
  };
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
  backButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 15,
    gap: 13,
  },
  notFoundCard: {
    margin: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
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
  timeline: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.info,
  },
  timelineText: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineTextActive: {
    color: colors.inkStrong,
  },
  actionGrid: {
    gap: 10,
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
  primaryButton: {
    minHeight: 46,
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
  itemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemImage: {
    width: 64,
    height: 78,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
  },
  itemImagePlaceholder: {
    width: 64,
    height: 78,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  itemTotal: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  returnCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 10,
  },
  returnTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  returnStatus: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '900',
  },
  returnActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniAction: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniActionText: {
    color: colors.inkStrong,
    fontSize: 11,
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
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 5,
  },
  infoTitle: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  infoValue: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  priceValue: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  priceStrong: {
    color: colors.inkStrong,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDone: {
    backgroundColor: colors.softGreen,
  },
  statusIssue: {
    backgroundColor: colors.warning,
  },
  statusText: {
    color: colors.warningStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  statusDoneText: {
    color: colors.green,
  },
  statusIssueText: {
    color: colors.danger,
  },
});
