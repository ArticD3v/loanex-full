import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/apiClient';

export default function EmiApplyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    productId: string;
    productName: string;
    productImage: string;
    price: string;
    variantId: string;
    planMonths: string;
    downPaymentAmount: string;
    monthlyEmi: string;
  }>();

  const price = Number(params.price || 0);
  const downPayment = Number(params.downPaymentAmount || 0);
  const monthlyEmi = Number(params.monthlyEmi || 0);
  const months = Number(params.planMonths || 0);
  const totalPayable = downPayment + monthlyEmi * months;

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appNumber, setAppNumber] = useState('');

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter your delivery address.');
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/legacy/emi-apply', {
        userId: user.id,
        productId: params.productId,
        variantId: params.variantId || undefined,
        requestedTenure: months,
        requestedDownPayment: downPayment,
        notes: notes.trim() || undefined,
      });
      setAppNumber(res.data.applicationNumber);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <View style={s.successIcon}>
          <MaterialIcons name="check" size={48} color="#fff" />
        </View>
        <Text style={s.successTitle}>Application Submitted!</Text>
        <Text style={s.successSub}>
          Your EMI application has been submitted successfully. Our team will review it and get back to you within 24–48 hours.
        </Text>
        <View style={s.appNumBox}>
          <Text style={s.appNumLabel}>Application Number</Text>
          <Text style={s.appNum}>{appNumber}</Text>
        </View>

        <View style={s.stepList}>
          {[
            { icon: 'hourglass-empty', label: 'Admin reviews your application', done: false },
            { icon: 'check-circle', label: 'Get approval notification', done: false },
            { icon: 'account-balance', label: 'Pay down payment to confirm', done: false },
            { icon: 'receipt-long', label: 'Monthly EMIs start', done: false },
          ].map((step, i) => (
            <View key={i} style={s.step}>
              <View style={[s.stepIcon, { backgroundColor: Colors.primaryLight }]}>
                <MaterialIcons name={step.icon as any} size={18} color={Colors.primary} />
              </View>
              <Text style={s.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={s.doneBtn} onPress={() => router.push('/(tabs)/' as any)}>
          <Text style={s.doneBtnTxt}>Go to Home</Text>
        </Pressable>
        <Pressable style={{ marginTop: 12 }} onPress={() => router.push('/emis' as any)}>
          <Text style={{ color: Colors.primary, fontSize: Fonts.sm, fontWeight: Fonts.medium }}>
            View My Applications →
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Apply for EMI</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 100 }}>

        {/* Product Summary */}
        <View style={s.productCard}>
          {params.productImage ? (
            <Image source={{ uri: params.productImage }} style={s.productImg} contentFit="cover" />
          ) : (
            <View style={[s.productImg, { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="inventory-2" size={32} color={Colors.border} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.productName} numberOfLines={2}>{params.productName}</Text>
            <Text style={s.productPrice}>₹{price.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* EMI Summary */}
        <View style={s.planBox}>
          <Text style={s.planTitle}>Selected EMI Plan</Text>
          <View style={s.planRow}>
            <View style={s.planStat}>
              <Text style={s.planStatVal}>{months}</Text>
              <Text style={s.planStatLabel}>Months</Text>
            </View>
            <View style={s.planDivider} />
            <View style={s.planStat}>
              <Text style={s.planStatVal}>₹{downPayment.toLocaleString('en-IN')}</Text>
              <Text style={s.planStatLabel}>Down Payment</Text>
            </View>
            <View style={s.planDivider} />
            <View style={s.planStat}>
              <Text style={s.planStatVal}>₹{monthlyEmi.toLocaleString('en-IN')}</Text>
              <Text style={s.planStatLabel}>Monthly EMI</Text>
            </View>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Payable</Text>
            <Text style={s.totalVal}>₹{totalPayable.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Application Flow Info */}
        <View style={s.infoBox}>
          <MaterialIcons name="info-outline" size={16} color={Colors.primary} />
          <Text style={s.infoText}>
            After submitting, admin will review your application. Once approved, you'll pay the down payment of{' '}
            <Text style={{ fontWeight: Fonts.bold }}>₹{downPayment.toLocaleString('en-IN')}</Text> to confirm your order.
            Then monthly EMIs of{' '}
            <Text style={{ fontWeight: Fonts.bold }}>₹{monthlyEmi.toLocaleString('en-IN')}</Text> start from next month.
          </Text>
        </View>

        {/* Delivery Address */}
        <View style={s.section}>
          <Text style={s.label}>Delivery Address <Text style={{ color: Colors.error }}>*</Text></Text>
          <TextInput
            style={s.textarea}
            placeholder="Enter your full delivery address..."
            placeholderTextColor={Colors.textTertiary}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Notes */}
        <View style={s.section}>
          <Text style={s.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={s.textarea}
            placeholder="Any special instructions or questions..."
            placeholderTextColor={Colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* T&C */}
        <Text style={s.tnc}>
          By submitting, you agree that the admin may contact you for verification.
          EMI approval is subject to KYC and credit evaluation.
        </Text>
      </ScrollView>

      {/* Submit Button */}
      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable style={[s.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <>
              <MaterialIcons name="send" size={18} color="#fff" />
              <Text style={s.submitTxt}>Submit EMI Application</Text>
            </>
          }
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  productCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm },
  productImg: { width: 72, height: 72, borderRadius: Radius.md },
  productName: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, lineHeight: 20 },
  productPrice: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary, marginTop: 6 },
  planBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary + '40', ...Shadow.sm },
  planTitle: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: Spacing.md },
  planStat: { alignItems: 'center', flex: 1 },
  planStatVal: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary },
  planStatLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 3 },
  planDivider: { width: 1, height: 36, backgroundColor: Colors.borderLight },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: Fonts.sm, color: Colors.textSecondary },
  totalVal: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  infoText: { flex: 1, fontSize: Fonts.sm, color: Colors.textSecondary, lineHeight: 19 },
  section: { marginBottom: Spacing.lg },
  label: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textPrimary, marginBottom: 8 },
  textarea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary, minHeight: 80 },
  tnc: { fontSize: Fonts.xs, color: Colors.textTertiary, lineHeight: 17, textAlign: 'center', marginBottom: Spacing.md },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, ...Shadow.lg as object },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 16, padding: 16 },
  submitTxt: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: '#fff' },
  // Success state
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  successTitle: { fontSize: 24, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md, textAlign: 'center' },
  successSub: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  appNumBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl, width: '100%' },
  appNumLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 4 },
  appNum: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary },
  stepList: { width: '100%', gap: Spacing.md, marginBottom: Spacing.xl },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepLabel: { fontSize: Fonts.sm, color: Colors.textSecondary, flex: 1 },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40 },
  doneBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
});
