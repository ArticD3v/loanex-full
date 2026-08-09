import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getAddresses, deleteAddress, setDefaultAddress } from '../services/addressService';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { Address } from '../types';

export default function AddressesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getAddresses(user.id);
    setAddresses(data);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSetDefault(id: string) {
    if (!user) return;
    await setDefaultAddress(user.id, id);
    load();
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteAddress(id);
        load();
      }},
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>My Addresses</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/add-address')}>
          <MaterialIcons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="location-on" size={72} color={Colors.border} />
          <Text style={styles.emptyTitle}>No addresses saved</Text>
          <Text style={styles.emptySub}>Add a delivery address for faster checkout</Text>
          <Pressable style={styles.addAddrBtn} onPress={() => router.push('/add-address')}>
            <Text style={styles.addAddrTxt}>Add New Address</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.labelRow}>
                  <View style={styles.labelBadge}>
                    <Text style={styles.labelTxt}>{item.label}</Text>
                  </View>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultTxt}>Default</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardActions}>
                  {!item.isDefault && (
                    <Pressable onPress={() => handleSetDefault(item.id)}>
                      <Text style={styles.setDefaultTxt}>Set as Default</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleDelete(item.id)}>
                    <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.addressText}>
                {item.fullAddress}, {item.city}, {item.state} - {item.pincode}
              </Text>
            </View>
          )}
        />
      )}

      {addresses.length > 0 && (
        <Pressable style={styles.fab} onPress={() => router.push('/add-address')}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Fonts.md, color: Colors.textSecondary },
  addAddrBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.full, marginTop: Spacing.md },
  addAddrTxt: { color: '#fff', fontWeight: Fonts.bold, fontSize: Fonts.md },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  labelBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full },
  labelTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  defaultBadge: { backgroundColor: Colors.successLight, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full },
  defaultTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, color: Colors.success },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  setDefaultTxt: { fontSize: Fonts.xs, color: Colors.primary, fontWeight: Fonts.medium },
  addressText: { fontSize: Fonts.md, color: Colors.textSecondary, lineHeight: 22 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.lg },
});
