import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '@/theme';

export const brandLogoSource = require('../../assets/logo.png');

export function BrandLogo({
  size = 40,
  framed = false,
  backgroundColor = colors.surface,
  style,
  imageStyle,
}: {
  size?: number;
  framed?: boolean;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  if (!framed) {
    return (
      <Image
        source={brandLogoSource}
        style={[styles.image, { width: size, height: size }, imageStyle]}
        resizeMode="contain"
      />
    );
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.34),
          backgroundColor,
        },
        style,
      ]}
    >
      <Image
        source={brandLogoSource}
        style={[styles.image, { width: size * 0.72, height: size * 0.72 }, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    alignSelf: 'center',
  },
});
