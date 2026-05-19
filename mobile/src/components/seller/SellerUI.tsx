import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors } from '@/theme';

type Tone = 'neutral' | 'brand' | 'commerce' | 'ai' | 'reward' | 'trust' | 'info' | 'success' | 'warning' | 'danger';

export function SellerScreenShell({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedEntrance delay={0}>
          <SellerHeader eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} />
        </AnimatedEntrance>
        <AnimatedEntrance delay={90}>
          {children}
        </AnimatedEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SellerHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function SellerSection({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title || subtitle || action ? (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SellerMetricTile({
  label,
  value,
  helper,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, toneStyles[tone].soft]}>{icon}</View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {helper ? <Text style={styles.metricHelper} numberOfLines={1}>{helper}</Text> : null}
    </View>
  );
}

export function SellerStatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.statusPill, toneStyles[tone].soft]}>
      <Text style={[styles.statusText, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

export function SellerListCard({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <AnimatedPressable style={styles.listCard} onPress={onPress} disabled={!onPress}>
      {children}
    </AnimatedPressable>
  );
}

export function SellerEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <AnimatedPressable style={styles.emptyButton} onPress={onAction}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

export function SellerProgressBar({ value, tone = 'brand' }: { value: number; tone?: Tone }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${normalized}%` }, toneStyles[tone].fill]} />
    </View>
  );
}

export const sellerToneTextColor = {
  neutral: colors.mutedSoft,
  brand: colors.brand,
  commerce: colors.commerce,
  ai: colors.ai,
  reward: colors.reward,
  trust: colors.trust,
  info: colors.info,
  success: colors.green,
  warning: colors.warningStrong,
  danger: colors.danger,
};

const toneStyles = {
  neutral: {
    soft: { backgroundColor: colors.surfaceSubtle },
    text: { color: colors.mutedSoft },
    fill: { backgroundColor: colors.mutedSoft },
  },
  brand: {
    soft: { backgroundColor: colors.brandSoft },
    text: { color: colors.brand },
    fill: { backgroundColor: colors.brand },
  },
  commerce: {
    soft: { backgroundColor: colors.commerceSoft },
    text: { color: colors.commerce },
    fill: { backgroundColor: colors.commerce },
  },
  ai: {
    soft: { backgroundColor: colors.aiSoft },
    text: { color: colors.ai },
    fill: { backgroundColor: colors.ai },
  },
  reward: {
    soft: { backgroundColor: colors.rewardSoft },
    text: { color: colors.reward },
    fill: { backgroundColor: colors.reward },
  },
  trust: {
    soft: { backgroundColor: colors.trustSoft },
    text: { color: colors.trust },
    fill: { backgroundColor: colors.trust },
  },
  info: {
    soft: { backgroundColor: colors.infoSoft },
    text: { color: colors.info },
    fill: { backgroundColor: colors.info },
  },
  success: {
    soft: { backgroundColor: colors.softGreen },
    text: { color: colors.green },
    fill: { backgroundColor: colors.green },
  },
  warning: {
    soft: { backgroundColor: colors.warning },
    text: { color: colors.warningStrong },
    fill: { backgroundColor: colors.warningStrong },
  },
  danger: {
    soft: { backgroundColor: colors.commerceSoft },
    text: { color: colors.danger },
    fill: { backgroundColor: colors.danger },
  },
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  headerAction: {
    paddingTop: 2,
  },
  eyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 15,
    gap: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionCopy: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  metricTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 104,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 6,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.inkStrong,
    fontSize: 19,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  metricHelper: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  listCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 10,
  },
  emptyState: {
    borderRadius: 22,
    backgroundColor: colors.surfaceSubtle,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyButton: {
    marginTop: 4,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
