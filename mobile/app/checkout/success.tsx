import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckoutStepLayout } from '@/components/CheckoutFlow';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';

export default function CheckoutSuccessScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { orders } = useAppState();
  const order = orders.find((item) => item.id === id) ?? orders[0];
  const iconScale = useRef(new Animated.Value(0.78)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        speed: 22,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, iconScale]);

  return (
    <CheckoutStepLayout title="Sipariş başarılı" subtitle="Siparişin oluşturuldu ve satıcıya iletildi.">
      <Animated.View style={[styles.successCard, { opacity: cardOpacity }]}>
        <Animated.View style={[styles.successIcon, { transform: [{ scale: iconScale }] }]}>
          <Check size={46} color={colors.trust} />
        </Animated.View>
        <Text style={styles.title}>Siparişin alındı</Text>
        <Text style={styles.body}>
          {order
            ? `${formatPrice(order.total)} tutarındaki siparişini Siparişlerim bölümünden takip edebilirsin.`
            : 'Siparişini Siparişlerim bölümünden takip edebilirsin.'}
        </Text>
        {order ? (
          <View style={styles.orderMeta}>
            <Text style={styles.metaLabel}>Sipariş no</Text>
            <Text style={styles.metaValue}>{order.id}</Text>
            <Text style={styles.metaLabel}>Tahmini teslimat</Text>
            <Text style={styles.metaValue}>{order.deliveryEta}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          {order ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace({ pathname: '/order/[id]', params: { id: order.id } })}
            >
              <Text style={styles.primaryButtonText}>Sipariş detayına git</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/explore')}>
            <Text style={styles.secondaryButtonText}>Keşfet'e dön</Text>
          </Pressable>
        </View>
      </Animated.View>
    </CheckoutStepLayout>
  );
}

const styles = StyleSheet.create({
  successCard: {
    minHeight: 520,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  successIcon: {
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: colors.trustSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.inkStrong,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '900',
  },
  body: {
    color: colors.mutedSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '700',
  },
  orderMeta: {
    alignSelf: 'stretch',
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    gap: 5,
    marginTop: 8,
  },
  metaLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
});
