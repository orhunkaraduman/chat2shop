import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/auth'), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen>
      <Pressable style={styles.container} onPress={() => router.replace('/auth')}>
        <BrandLogo size={124} />
        <Text style={styles.logoText}>Chat2Shop</Text>
        <View style={styles.homeIndicator} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoText: {
    color: colors.surface,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 92,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
});
