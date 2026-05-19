import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  value: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  label: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
