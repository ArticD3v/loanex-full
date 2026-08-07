import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';

const PAYMENT_METHODS = [
  {
    id: 'cod',
    name: 'Cash on Delivery',
    icon: 'money',
    desc: 'Pay when your order is delivered',
    color: Colors.success,
    demo: true,
  },
  {
    id: 'emi',
    name: 'EMI (Easy Installments)',
    icon: 'account-balance',
    desc: 'Split your payment into monthly installments',
    color: Colors.primary,
    demo: true,
  },
  {
    id: 'upi',
    name: 'UPI (Demo)',
    icon: 'qr-code',
    desc: 'Pay via Google Pay, PhonePe, Paytm. Demo mode — no real charge',
    color: '#7C3AED',
    demo: true,
  },
  {
    id: 'card',
    name: 'Credit / Debit Card (Demo)',
    icon: 'credit-card',
    desc: 'Visa, Mastercard, RuPay. Demo mode — no real charge',
    color: '#2563EB',
    demo: true,
  },
  {
    id: 'netbanking',
    name: 'Net Banking (Demo)',
    icon: 'account-balance',
    desc: 'All major banks supported. Demo mode — no real charge',
    color: '#059669',
    demo: true,
  },
];

const SAVED_CARDS = [
  { id: '1', type: 'Visa', last4: '4242', expiry: '12/26', color: '#2563EB' },
  { id: '2', type: 'Mastercard', last4: '8888', expiry: '08/25', color: '#DC2626' },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelected(id);
    Alert.alert(
      'Demo Payment',
      `You selected "${PAYMENT_METHODS.find(p => p.id === id)?.name}".\n\nThis is a demo mode. No real payment will be processed.\n\nIn production, a real payment gateway would be integrated here.`,
      [{ text: 'OK', onPress: () => setSelected(null) }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Saved Cards */}
        <Text style={styles.sectionTitle}>Saved Cards</Text>
        {SAVED_CARDS.map(card => (
          <View key={card.id} style={styles.cardItem}>
            <View style={[styles.cardIcon, { backgroundColor: card.color }]}>
              <MaterialIcons name="credit-card" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardType}>{card.type}</Text>
              <Text style={styles.cardLast}>•••• {card.last4} | Expires {card.expiry}</Text>
            </View>
            <MaterialIcons name="check-circle" size={20} color={Colors.success} />
          </View>
        ))}
        <Pressable style={styles.addCard}>
          <MaterialIcons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addCardTxt}>Add New Card</Text>
        </Pressable>

        {/* Other Methods */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>Other Payment Methods</Text>
        {PAYMENT_METHODS.map(method => (
          <Pressable
            key={method.id}
            style={[styles.methodItem, selected === method.id && styles.methodSelected]}
            onPress={() => handleSelect(method.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.color + '18' }]}>
              <MaterialIcons name={method.icon as any} size={22} color={method.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodDesc}>{method.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
          </Pressable>
        ))}

        <View style={styles.demoBadge}>
          <MaterialIcons name="info-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.demoBadgeTxt}>Demo mode — No real payment gateway connected. All transactions are simulated.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, marginBottom: Spacing.md },
  cardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardType: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  cardLast: { fontSize: Fonts.sm, color: Colors.textTertiary, marginTop: 2 },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  addCardTxt: { fontSize: Fonts.md, color: Colors.primary, fontWeight: Fonts.medium },
  methodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  methodSelected: { borderWidth: 2, borderColor: Colors.primary },
  methodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  methodDesc: { fontSize: Fonts.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  demoBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  demoBadgeTxt: { flex: 1, fontSize: Fonts.sm, color: Colors.textTertiary, lineHeight: 18 },
});
