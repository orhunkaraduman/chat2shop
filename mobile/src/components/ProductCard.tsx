import { Heart, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FadeInImage } from '@/components/FadeInImage';
import { colors, formatPrice, getCategoryAccent } from '@/theme';
import { FitRecommendation, Product, RecommendationResult } from '@/types';

type Props = {
  recommendation: RecommendationResult;
  active?: boolean;
  onSelect: (product: Product) => void;
  onDetails: (product: Product) => void;
  onTryOn: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  fitRecommendation: FitRecommendation;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
};

export function ProductCard({
  recommendation,
  active = false,
  onSelect,
  onDetails,
  fitRecommendation,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const { product } = recommendation;
  const accent = getCategoryAccent(product.category);

  return (
    <AnimatedPressable
      style={[styles.card, active && { borderColor: accent.accent }]}
      onPress={() => {
        onSelect(product);
        onDetails(product);
      }}
    >
      <View style={styles.imageSurface}>
        <FadeInImage source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        <AnimatedPressable style={styles.favoriteButton} scaleTo={0.9} onPress={() => onToggleFavorite(product)}>
          <Heart
            size={16}
            color={isFavorite ? colors.favorite : colors.inkStrong}
            fill={isFavorite ? colors.favorite : 'transparent'}
          />
        </AnimatedPressable>
      </View>
      <View style={styles.body}>
        <View style={[styles.categoryStrip, { backgroundColor: accent.accent }]} />
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <View style={styles.signalRow}>
          <View style={styles.matchPill}>
            <Sparkles size={11} color={colors.ai} />
            <Text style={styles.matchText}>%{recommendation.matchScore} uyum · {fitRecommendation.recommendedSize}</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  imageSurface: {
    height: 172,
    backgroundColor: colors.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 12,
    gap: 7,
  },
  categoryStrip: {
    width: 34,
    height: 3,
    borderRadius: 2,
  },
  title: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  price: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchPill: {
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.aiSoft,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
});
