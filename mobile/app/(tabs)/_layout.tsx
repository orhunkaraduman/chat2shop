import { Tabs } from 'expo-router';
import {
  BarChart3,
  Compass,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  Shirt,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react-native';

import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';

export default function TabLayout() {
  const { currentUser } = useAppState();
  const isSeller = currentUser?.role === 'seller';

  return (
    <Tabs
      initialRouteName={isSeller ? 'profile' : 'explore'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          href: isSeller ? null : undefined,
          title: 'Keşfet',
          tabBarIcon: ({ color }) => <Compass size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: isSeller ? null : undefined,
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageCircle size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="try-on"
        options={{
          href: isSeller ? null : undefined,
          title: 'Kabin',
          tabBarIcon: ({ color }) => <Shirt size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: isSeller ? null : undefined,
          title: 'Sepet',
          tabBarIcon: ({ color }) => <ShoppingBag size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isSeller ? 'Panel' : 'Profil',
          tabBarIcon: ({ color }) => (isSeller ? <BarChart3 size={20} color={color} /> : <UserRound size={20} color={color} />),
        }}
      />
      <Tabs.Screen
        name="seller-products"
        options={{
          href: isSeller ? undefined : null,
          title: 'Ürünler',
          tabBarIcon: ({ color }) => <PackageSearch size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="seller-orders"
        options={{
          href: isSeller ? undefined : null,
          title: 'Siparişler',
          tabBarIcon: ({ color }) => <ReceiptText size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="seller-store"
        options={{
          href: isSeller ? undefined : null,
          title: 'Mağaza',
          tabBarIcon: ({ color }) => <Store size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="seller"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
