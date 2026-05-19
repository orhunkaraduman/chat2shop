import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ShoppingBag, Trash2 } from 'lucide-react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, formatPrice } from '@/theme';
import { CartItem, Product } from '@/types';

export type CheckoutItem = CartItem & { product: Product };

export function getCheckoutItems(cartItems: CartItem[], catalog: Product[]) {
  return cartItems
    .map((item) => ({
      ...item,
      product: catalog.find((product) => product.id === item.productId),
    }))
    .filter((item): item is CheckoutItem => Boolean(item.product));
}

export function CheckoutStepLayout({
  step,
  title,
  subtitle,
  onBack,
  children,
  footer,
  includeBottomInset = true,
}: {
  step?: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  includeBottomInset?: boolean;
}) {
  const edges: Edge[] = includeBottomInset ? ['top', 'right', 'bottom', 'left'] : ['top', 'right', 'left'];

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={styles.shell}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, Boolean(footer) && styles.contentWithFooter]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {onBack ? (
                <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
                  <ChevronLeft size={20} color={colors.inkStrong} />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              {step ? <Text style={styles.stepText}>{step}/4</Text> : null}
            </View>
            {step ? (
              <View style={styles.progressTrack}>
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} style={[styles.progressSegment, item <= step && styles.progressSegmentActive]} />
                ))}
              </View>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {children}
        </ScrollView>
        {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function CheckoutFooter({
  caption,
  total,
  primaryLabel,
  onPrimaryPress,
  disabled,
  secondaryLabel,
  onSecondaryPress,
}: {
  caption?: string;
  total?: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  disabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <View style={styles.footer}>
      {caption || total ? (
        <View style={styles.footerTotal}>
          {caption ? <Text style={styles.footerCaption}>{caption}</Text> : null}
          {total ? <Text style={styles.footerTotalText}>{total}</Text> : null}
        </View>
      ) : null}
      <Pressable style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]} disabled={disabled} onPress={onPrimaryPress}>
        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
      </Pressable>
      {secondaryLabel && onSecondaryPress ? (
        <Pressable style={styles.secondaryButton} onPress={onSecondaryPress}>
          <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CheckoutGuard({
  title = 'Sepetin boş',
  body = 'Satın alma akışına devam etmek için önce sepete ürün eklemelisin.',
  actionLabel = 'Sepete dön',
  onAction,
}: {
  title?: string;
  body?: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.guardCard}>
      <View style={styles.guardIcon}>
        <ShoppingBag size={34} color={colors.commerce} />
      </View>
      <Text style={styles.guardTitle}>{title}</Text>
      <Text style={styles.guardBody}>{body}</Text>
      <Pressable style={styles.guardButton} onPress={onAction}>
        <Text style={styles.guardButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export function CheckoutSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function SelectableRow({
  active,
  title,
  subtitle,
  meta,
  onPress,
  onRemove,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  meta?: string;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable style={[styles.selectableRow, active && styles.selectableRowActive]} onPress={onPress}>
      <View style={styles.selectRadio}>{active ? <View style={styles.selectRadioDot} /> : null}</View>
      <View style={styles.selectableBody}>
        <Text style={styles.selectableTitle}>{title}</Text>
        {subtitle ? <Text style={styles.selectableSubtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.selectableMeta}>{meta}</Text> : null}
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Trash2 size={15} color={colors.mutedSoft} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedSoft}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
      />
    </View>
  );
}

export function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

export function MiniOrderItem({ item }: { item: CheckoutItem }) {
  return (
    <View style={styles.miniItem}>
      <Image source={{ uri: item.product.imageUrl }} style={styles.miniImage} resizeMode="cover" />
      <View style={styles.miniBody}>
        <Text style={styles.miniTitle} numberOfLines={1}>
          {item.product.title}
        </Text>
        <Text style={styles.miniMeta}>
          {item.quantity} adet · Beden {item.size} · {item.product.color}
        </Text>
      </View>
      <Text style={styles.miniPrice}>{formatPrice(item.product.price * item.quantity)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  contentWithFooter: {
    paddingBottom: 18,
  },
  header: {
    gap: 10,
  },
  headerTop: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  stepText: {
    color: colors.mutedSoft,
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.lineStrong,
  },
  progressSegmentActive: {
    backgroundColor: colors.inkStrong,
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
  footerWrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footer: {
    gap: 10,
  },
  footerTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerCaption: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  footerTotalText: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 44,
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
  guardCard: {
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
  guardIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: colors.commerceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardTitle: {
    color: colors.inkStrong,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  guardBody: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  guardButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: colors.inkStrong,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  guardButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  section: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionText: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    color: colors.inkStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionAction: {
    color: colors.commerce,
    fontSize: 12,
    fontWeight: '900',
  },
  selectableRow: {
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectableRowActive: {
    borderColor: colors.commerce,
    backgroundColor: colors.commerceSoft,
  },
  selectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.commerce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.commerce,
  },
  selectableBody: {
    flex: 1,
    gap: 3,
  },
  selectableTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  selectableSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  selectableMeta: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 13,
    color: colors.inkStrong,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryStrong: {
    color: colors.inkStrong,
    fontSize: 16,
  },
  miniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniImage: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
  },
  miniBody: {
    flex: 1,
    gap: 4,
  },
  miniTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  miniMeta: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  miniPrice: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: '900',
  },
});
