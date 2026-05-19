import { FitFeedback, FitRecommendation, Product, StyleProfile } from '@/types';

const apparelOrder = ['XS', 'S', 'M', 'L', 'XL'];

export function getFitRecommendation(
  product: Product,
  profile: StyleProfile,
  selectedSize = profile.size,
  feedback: FitFeedback[] = [],
): FitRecommendation {
  if (product.sizes.includes('STD')) {
    return {
      recommendedSize: 'STD',
      confidence: 'high',
      risk: 'low',
      reason: 'Bu ürün standart bedenli olduğu için beden riski düşük görünüyor.',
    };
  }

  const profileSize = normalizeSize(profile.size);
  const available = product.sizes.map(normalizeSize);
  const hasProfileSize = available.includes(profileSize);
  const selected = normalizeSize(selectedSize);
  const fitMatchesPreference = product.fit === profile.fitPreference;
  const isRelaxedPreference = profile.fitPreference === 'oversize' || profile.fitPreference === 'relaxed';
  const alternativeSize = findNextSize(profileSize, product.sizes);
  const sizeChartRow = product.sizeChart?.find((row) => normalizeSize(row.size) === profileSize);
  const feedbackSummary = summarizeFeedback(feedback);

  if (sizeChartRow && hasProfileSize) {
    const feedbackReason = feedbackSummary
      ? ` Kullanıcı fit feedback özeti: ${feedbackSummary.label}.`
      : '';

    return {
      recommendedSize: profileSize,
      alternativeSize: feedbackSummary?.dominant === 'tight' ? alternativeSize : undefined,
      confidence: feedbackSummary ? 'high' : 'medium',
      risk: feedbackSummary?.dominant === 'true' ? 'low' : feedbackSummary?.dominant === 'tight' ? 'medium' : 'low',
      reason: `${profileSize} beden için beden tablosu mevcut${
        sizeChartRow.waist ? `; bel ölçüsü ${sizeChartRow.waist}` : ''
      }${sizeChartRow.length ? `, uzunluk ${sizeChartRow.length}` : ''}.${feedbackReason}`,
    };
  }

  if (hasProfileSize && fitMatchesPreference) {
    return {
      recommendedSize: profileSize,
      alternativeSize,
      confidence: 'high',
      risk: 'low',
      reason: `${profileSize} beden stokta ve ürünün ${product.fit} fit yapısı profilindeki fit tercihiyle uyumlu.${formatFeedbackReason(feedbackSummary)}`,
    };
  }

  if (hasProfileSize) {
    return {
      recommendedSize: profileSize,
      alternativeSize: isRelaxedPreference ? alternativeSize : undefined,
      confidence: 'medium',
      risk: product.fit === 'slim' ? 'medium' : 'low',
      reason:
        product.fit === 'slim'
          ? `${profileSize} beden uygun görünüyor; slim fit nedeniyle daha rahat duruş için ${alternativeSize ?? 'bir büyük beden'} değerlendirilebilir.${formatFeedbackReason(feedbackSummary)}`
          : `${profileSize} beden uygun görünüyor; ürün fit bilgisiyle birlikte karar vermek daha güvenli olur.${formatFeedbackReason(feedbackSummary)}`,
    };
  }

  const fallback = product.sizes[0];
  return {
    recommendedSize: fallback,
    confidence: 'low',
    risk: 'high',
    reason: `${profileSize} beden stokta yok. En yakın seçenek ${fallback}; satın almadan önce beden tablosu kontrol edilmeli.`,
  };
}

export function fitRiskLabel(recommendation: FitRecommendation) {
  if (recommendation.risk === 'low') return 'Düşük risk';
  if (recommendation.risk === 'medium') return 'Orta risk';
  return 'Yüksek risk';
}

function normalizeSize(size: string) {
  return size.trim().toUpperCase();
}

function findNextSize(size: string, sizes: string[]) {
  const index = apparelOrder.indexOf(size);
  if (index === -1) {
    return sizes[0];
  }

  return apparelOrder.slice(index + 1).find((candidate) => sizes.includes(candidate));
}

function summarizeFeedback(feedback: FitFeedback[]) {
  if (feedback.length === 0) return undefined;

  const counts = feedback.reduce(
    (result, item) => ({
      ...result,
      [item.result]: result[item.result] + 1,
    }),
    { tight: 0, true: 0, loose: 0 },
  );
  const dominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'true') as FitFeedback['result'];
  const label =
    dominant === 'tight'
      ? 'çoğunluk dar geldi diyor'
      : dominant === 'loose'
        ? 'çoğunluk bol geldi diyor'
        : 'çoğunluk tam oldu diyor';

  return { dominant, label };
}

function formatFeedbackReason(summary: ReturnType<typeof summarizeFeedback>) {
  return summary ? ` ${summary.label}.` : '';
}
