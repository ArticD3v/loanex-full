import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dropdown } from '../../components/ui/Dropdown';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

import { getOrderById, updateOrderStatus } from '../../services/orderService';
import { Order, OrderStatus } from '../../types/order';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  approved: 'Approved',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export function OrderDetailsScreen({ navigation, route }: Props) {
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  const fetchOrder = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrderById(route.params.orderId);
      setOrder(data);
    } catch (e) {
      console.warn('Failed to fetch order details', e);
    } finally {
      setLoading(false);
    }
  }, [route.params.orderId]);

  React.useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const updatedOrder = await updateOrderStatus(route.params.orderId, {
        status: newStatus.toUpperCase(),
      });
      setOrder(updatedOrder);
    } catch (e: any) {
      console.warn('Failed to update status', e);
      alert(e.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={[styles.notFound, { justifyContent: 'center' }]}>
          <Text>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title="Order Information" />
          <DetailRow label="Order ID" value={order.id} />
          <DetailRow label="Order Date" value={formatDate(order.orderDate)} />
          <DetailRow label="Payment Type" value={formatLabel(order.paymentType)} isLast />
          
          <View style={{ marginTop: 16 }}>
             <Dropdown 
               label="Update Order Status" 
               options={STATUS_OPTIONS} 
               value={order.status} 
               onSelect={handleUpdateStatus} 
             />
             {updatingStatus && <Text style={{ color: colors.primary, marginTop: 4, fontSize: 12 }}>Updating...</Text>}
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Customer Information" />
          <DetailRow label="Customer Name" value={order.customerName} />
          <DetailRow label="Customer ID" value={order.customerId} />
          <DetailRow label="Mobile Number" value={order.customerMobile} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Product Information" />
          <View style={styles.productImageWrap}>
            {order.productImageUrl ? (
              <Image source={{ uri: order.productImageUrl }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
              </View>
            )}
          </View>
          <DetailRow label="Product Name" value={order.productName} />
          <DetailRow label="Quantity" value={String(order.quantity)} />
          <DetailRow label="Selling Price" value={formatAmount(order.sellingPrice)} />
          <DetailRow label="Total Amount" value={formatAmount(order.totalAmount)} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="EMI Information" />
          <DetailRow
            label="Payment Type"
            value={formatLabel(order.paymentType)}
            isLast={order.paymentType !== 'emi'}
          />
          {order.paymentType === 'emi' && (
            <>
              <DetailRow label="EMI Plan" value={order.emiPlan ?? '—'} />
              <DetailRow
                label="EMI Amount"
                value={order.emiAmount != null ? formatAmount(order.emiAmount) : '—'}
              />
              <DetailRow label="EMI Duration" value={order.emiDuration ?? '—'} isLast />
            </>
          )}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="View Customer"
          onPress={() => navigation.navigate('CustomerDetails', { customerId: order.customerId })}
          variant="outline"
          style={styles.footerBtn}
        />
        <Button
          title="View Product"
          onPress={() => navigation.navigate('ProductDetails', { productId: order.productId })}
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
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  productImageWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: {
    flex: 1,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
});
