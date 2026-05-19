import { AlertTriangle, Ruler } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { fitRiskLabel } from '@/services/fit';
import { colors } from '@/theme';
import { FitRecommendation } from '@/types';

export function FitInsight({ recommendation }: { recommendation: FitRecommendation }) {
  const risky = recommendation.risk !== 'low';

  return (
    <View style={[styles.card, risky && styles.warningCard]}>
      {risky ? <AlertTriangle size={16} color={colors.danger} /> : <Ruler size={16} color={colors.trust} />}
      <View style={styles.copy}>
        <Text style={styles.title}>
          Önerilen beden: {recommendation.recommendedSize} · {fitRiskLabel(recommendation)}
        </Text>
        <Text style={styles.body}>{recommendation.reason}</Text>
        {recommendation.alternativeSize && (
          <Text style={styles.alt}>Alternatif: {recommendation.alternativeSize}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 9,
    borderRadius: 8,
    backgroundColor: colors.trustSoft,
    borderWidth: 1,
    borderColor: colors.trust,
    padding: 10,
  },
  warningCard: {
    backgroundColor: colors.warning,
    borderColor: colors.warningBorder,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  alt: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
});
