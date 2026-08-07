import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';

export default function EMIsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { orders } = useOrders();

  const emiOrders = orders.filter(o => o.paymentMethod === 'emi');

  if (!user) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <MaterialIcons name="account-balance" size={80} color={Colors.border} />
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptySub}>Please login to view your EMI applications</Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnTxt}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My EMIs</Text>
      </View>

      {emiOrders.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="account-balance-wallet" size={80} color={Colors.border} />
          <Text style={styles.emptyTitle}>No EMIs yet</Text>
          <Text style={styles.emptySub}>You haven't applied for any EMIs.</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.loginBtnTxt}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={emiOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: Spacing.md }}
          renderItem={({ item }) => {
            const firstItem = item.items[0];
            const emi = item.emiDetails;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? Colors.warning + '20' : Colors.success + '20' }]}>
                    <Text style={[styles.statusTxt, { color: item.status === 'pending' ? Colors.warning : Colors.success }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {firstItem && (
                  <Text style={styles.productName}>{firstItem.productName} {item.items.length > 1 ? `+ ${item.items.length - 1} more` : ''}</Text>
                )}
                {emi && (
                  <View style={styles.emiDetails}>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Monthly EMI</Text>
                      <Text style={styles.detailValue}>{APP_CONFIG.currency}{emi.monthlyAmount?.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Tenure</Text>
                      <Text style={styles.detailValue}>{emi.months} Months</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.date}>Applied on {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySub: { fontSize: Fonts.sm, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
  loginBtn: { marginTop: Spacing.xl, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.full },
  loginBtnTxt: { color: '#fff', fontWeight: Fonts.bold, fontSize: Fonts.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  orderId: { fontSize: Fonts.sm, fontWeight: Fonts.bold, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusTxt: { fontSize: 10, fontWeight: Fonts.bold },
  productName: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, marginBottom: Spacing.md },
  emiDetails: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  detailBox: { flex: 1, backgroundColor: Colors.surfaceAlt, padding: Spacing.sm, borderRadius: Radius.md },
  detailLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase' },
  detailValue: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.primary, marginTop: 2 },
  date: { fontSize: Fonts.xs, color: Colors.textTertiary },
});
