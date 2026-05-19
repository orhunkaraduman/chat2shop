import { StyleSheet, Text, View } from 'react-native';

import { colors, formatPrice } from '@/theme';
import { ComparisonRow } from '@/types';

export function ComparisonCard({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Ürün karşılaştırma</Text>
      <Text style={styles.title}>İlk üç öneri</Text>
      {rows.map((row) => (
        <View key={row.productId} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.productTitle}>{row.title}</Text>
            <Text style={styles.score}>%{row.matchScore}</Text>
          </View>
          <View style={styles.metaGrid}>
            <Meta label="Fiyat" value={formatPrice(row.price)} />
            <Meta label="Kullanım" value={row.occasion} />
            <Meta label="Stil" value={row.styleFit} />
            <Meta label="Fit riski" value={row.fitRisk} />
            <Meta label="Modesty" value={row.modesty} />
          </View>
          <Text style={styles.verdict}>{row.verdict}</Text>
        </View>
      ))}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  eyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  productTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  score: {
    color: colors.ai,
    fontSize: 14,
    fontWeight: '900',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: {
    minWidth: '47%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  verdict: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});
