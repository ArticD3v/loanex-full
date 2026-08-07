import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { Colors, Fonts } from '../../constants/theme';

export default function CustomerTabLayout() {
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textTertiary,
      tabBarStyle: {
        height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
        paddingTop: 8,
        paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: Fonts.medium },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: ({ color, size }) => <MaterialIcons name="grid-view" size={size} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ color, size }) => <MaterialIcons name="shopping-cart" size={size} color={color} />, tabBarBadge: totalItems > 0 ? totalItems : undefined, tabBarBadgeStyle: { backgroundColor: Colors.primary, fontSize: 10 } }} />
      <Tabs.Screen name="emis" options={{ title: 'My EMIs', tabBarIcon: ({ color, size }) => <MaterialIcons name="account-balance" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
