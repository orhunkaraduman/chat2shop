import { router } from 'expo-router';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';

export default function OrdersScreen() {
  const { orders, getSellerOrdersForBuyerOrder } = useAppState();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Siparişlerim" subtitle="Satın aldığın ürünleri ve kargo durumunu takip et." />

        {orders.length > 0 ? (
          <View style={styles.stack}>
            {orders.map((order) => {
              const status = buyerStatusLabel(getSellerOrdersForBuyerOrder(order.id).map((item) => item.status));
              return (
                <Pressable
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                >
                  <View style={styles.orderIcon}>
                    <ClipboardList size={18} color={colors.info} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.orderTitle}>{order.id}</Text>
                    <Text style={styles.orderMeta}>
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')} · {order.items.length} ürün
                    </Text>
                    <Text style={styles.orderMeta}>{formatPrice(order.total)} · {order.deliveryLabel}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{status}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <ClipboardList size={38} color={colors.info} />
            <Text style={styles.emptyTitle}>Henüz sipariş yok</Text>
            <Text style={styles.emptyText}>Keşfet veya Chat ekranından ürün ekleyip satın alma akışını tamamlayabilirsin.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/explore')}>
              <Text style={styles.primaryButtonText}>Keşfet'e git</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
        <ChevronLeft size={20} color={colors.inkStrong} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function buyerStatusLabel(statuses: string[]) {
  if (statuses.length === 0) return 'Bekleniyor';
  if (statuses.includes('issue')) return 'Sorunlu';
  if (statuses.every((status) => status === 'completed')) return 'Tamamlandı';
  if (statuses.includes('shipped')) return 'Kargoda';
  if (statuses.includes('preparing')) return 'Hazırlanıyor';
  return 'Yeni';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  stack: {
    gap: 10,
  },
  orderCard: {
    minHeight: 86,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  orderTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  orderMeta: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 360,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    color: colors.inkStrong,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.info,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
});
