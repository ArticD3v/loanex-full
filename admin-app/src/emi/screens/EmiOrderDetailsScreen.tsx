import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { findEmiOrder } from '../data/emiOrderMockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmiOrderDetails'>;

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function EmiOrderDetailsScreen({ navigation, route }: Props) {
  const order = findEmiOrder(route.params.applicationId);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleGoBack]),
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Order not found</Text>
          <Button title="Back" variant="outline" onPress={handleGoBack} style={styles.backAction} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title="Order Information" />
          <DetailRow label="Order ID" value={order.orderId} />
          <DetailRow label="Customer" value={order.customerName} />
          <DetailRow label="Product" value={order.productName} />
          <DetailRow label="Amount" value={formatAmount(order.amount)} />
          <DetailRow label="Payment Type" value={order.paymentType} />
          <DetailRow label="Order Date" value={formatDate(order.orderDate)} />
          <DetailRow label="Status" value={order.status} isLast />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="View Customer"
          variant="outline"
          onPress={() =>
            navigation.navigate('CustomerDetails', { customerId: order.customerId })
          }
          style={styles.footerBtn}
        />
        <Button
          title="View Product"
          onPress={() =>
            navigation.navigate('ProductDetails', { productId: order.productId })
          }
          style={styles.footerBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
  backAction: { minWidth: 140 },
});
