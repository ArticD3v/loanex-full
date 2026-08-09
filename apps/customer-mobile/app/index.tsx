import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/theme';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // The customer app has no admin console — every authenticated user lands on
  // the customer home. Admins manage the store from the separate admin-app.
  useEffect(() => {
    if (isLoading) return;
    router.replace('/(tabs)');
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
