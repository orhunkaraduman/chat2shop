import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/state/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="buyer-credits" />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="checkout/delivery" />
          <Stack.Screen name="checkout/payment" />
          <Stack.Screen name="checkout/review" />
          <Stack.Screen name="checkout/success" />
          <Stack.Screen name="addresses" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="payments" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="settings/[section]" />
          <Stack.Screen name="seller-order/[id]" />
          <Stack.Screen name="seller-credits" />
          <Stack.Screen name="seller-product/[id]" />
          <Stack.Screen name="store/[id]" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
