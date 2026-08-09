import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, Platform } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import PaymentWebView from '../components/feature/PaymentWebView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { generateCheckoutHTML } from '../services/razorpayService';
import {
  getEmiPaymentDetails,
  getLoanDashboard,
  createEmiPaymentOrder,
  createDevBypassSignature,
  verifyEmiPayment,
  downloadEmiReceipt,
} from '../services/emiPaymentService';

const showAlert = (title: string, msg: string, onOk?: () => void) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n${msg}`); onOk?.(); }
  else { /* Alert below to avoid circular import */ }
};

export default function EmiPayScreen() {
  const { emiId } = useLocalSearchParams<{ emiId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<any>(null);
  /** Live paid-EMI ledger — same rows as the My EMIs tab / invoice. */
  const [history, setHistory] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [checkout, setCheckout] = useState<{
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    prefill: { name: string; email: string; contact: string };
  } | null>(null);

  const load = useCallback(() => {
    if (!emiId) { setError('Invalid EMI ID.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    getEmiPaymentDetails(emiId)
      .then((d) => {
        setDetails(d);
        if (d.alreadyPaid) setSuccess({ message: 'This EMI is already paid.' });
      })
      .catch((e: any) => setError(e.message || 'Unable to load EMI payment details.'))
      .finally(() => setLoading(false));
    // Secondary read — the ledger never blocks the payment action.
    getLoanDashboard()
      .then((d) => setHistory(d?.recentPayments ?? []))
      .catch(() => {});
  }, [emiId]);

  React.useEffect(() => { load(); }, [load]);

  const formatInr = (n: number | null | undefined) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const formatDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  async function payNow() {
    if (paying || !details?.canPay) return;
    setPaying(true);
    setError('');
    try {
      const order = await createEmiPaymentOrder(emiId);
      if (order.paymentDevBypass) {
        const signed = await createDevBypassSignature(order.razorpayOrderId);
        await doVerify({
          emiId,
          razorpayOrderId: signed.razorpayOrderId,
          razorpayPaymentId: signed.razorpayPaymentId,
          razorpaySignature: signed.razorpaySignature,
        });
      } else {
        setCheckout({
          keyId: order.keyId,
          orderId: order.razorpayOrderId,
          amountPaise: order.amountPaise,
          currency: order.currency,
          prefill: order.prefill,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Unable to start EMI payment.');
    } finally {
      setPaying(false);
    }
  }

  async function doVerify(payload: {
    emiId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    try {
      const result = await verifyEmiPayment(payload);
      setCheckout(null);
      setSuccess(result);
      // Refresh the underlying details for the receipt button, but never clobber
      // the success panel with a follow-up "already paid" read.
      getEmiPaymentDetails(emiId).then(setDetails).catch(() => {});
    } catch (e: any) {
      setCheckout(null);
      setError(e.message || 'Payment verification failed.');
    }
  }

  const handleWebViewMessage = useCallback(async (event: WebViewMessageEvent) => {
    let data: any;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }
    switch (data.event) {
      case 'payment.success':
        await doVerify({
          emiId,
          razorpayOrderId: data.razorpay_order_id,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
        });
        break;
      case 'payment.cancelled':
        setCheckout(null);
        setError('Payment was cancelled. You can try again when ready.');
        break;
      case 'payment.failed':
        setCheckout(null);
        setError(data.error_description || 'Payment failed.');
        break;
      case 'payment.error':
        setCheckout(null);
        setError(data.message || 'An error occurred while processing payment.');
        break;
    }
  }, [emiId]);

  const checkoutHtml = checkout
    ? generateCheckoutHTML({
        key_id: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amountPaise,
        currency: checkout.currency,
        name: 'LoanEx',
        description: `EMI #${details?.emi?.emiNumber ?? ''} payment`,
        prefill_email: checkout.prefill?.email ?? '',
        prefill_contact: checkout.prefill?.contact ?? '',
        theme_color: Colors.primary,
      })
    : '';

  async function downloadReceipt() {
    try {
      const blob = await downloadEmiReceipt(emiId);
      if (Platform.OS === 'web' && blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emi-${details?.emi?.emiNumber ?? 'payment'}-receipt.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        showAlert('Receipt', `Receipt available for EMI #${details?.emi?.emiNumber ?? ''}`);
      }
    } catch (e: any) {
      setError(e.message || 'Unable to download receipt.');
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerSub}>Loading EMI payment details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Pay EMI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>⚠️ {error}</Text>
            <Pressable style={styles.primaryBtn} onPress={() => { setError(''); load(); }}>
              <Text style={styles.primaryBtnTxt}>Try Again</Text>
            </Pressable>
          </View>
        ) : success ? (
          <View style={styles.card}>
            <MaterialIcons name="check-circle" size={56} color={Colors.success} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
            <Text style={styles.successTitle}>{success.message || 'EMI payment successful.'}</Text>
            {success.paymentId && (
              <Text style={styles.successSub}>Payment ID: {success.paymentId}</Text>
            )}
            {success.paidAmount != null && (
              <Text style={styles.successAmt}>{formatInr(success.paidAmount)} paid</Text>
            )}
            {success.remainingEmis != null && (
              <Text style={styles.successSub}>{success.remainingEmis} EMI{success.remainingEmis !== 1 ? 's' : ''} remaining · Outstanding {formatInr(success.outstandingAmount)}</Text>
            )}
            {(details?.receiptAvailable || success.receiptAvailable) && (
              <Pressable style={styles.secondaryBtn} onPress={downloadReceipt}>
                <MaterialIcons name="download" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnTxt}>Download Receipt</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/emis')}>
              <Text style={styles.primaryBtnTxt}>Back to My EMIs</Text>
            </Pressable>
          </View>
        ) : details ? (
          <>
            {/* Loan details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Loan Details</Text>
              <View style={styles.row}><Text style={styles.k}>Loan Account</Text><Text style={styles.v}>{details.loan.loanAccountNumber}</Text></View>
              <View style={styles.row}><Text style={styles.k}>Product</Text><Text style={styles.v}>{details.loan.productName}</Text></View>
              <View style={styles.row}><Text style={styles.k}>Status</Text><Text style={styles.v}>{details.loan.loanStatus}</Text></View>
            </View>

            {/* EMI details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>EMI Details</Text>
              <View style={styles.row}><Text style={styles.k}>EMI Number</Text><Text style={styles.v}>#{details.emi.emiNumber}</Text></View>
              <View style={styles.row}><Text style={styles.k}>Due Date</Text><Text style={styles.v}>{formatDate(details.emi.dueDate)}</Text></View>
              <View style={styles.row}><Text style={styles.k}>Principal</Text><Text style={styles.v}>{formatInr(details.emi.principalAmount)}</Text></View>
              <View style={styles.row}><Text style={styles.k}>Interest</Text><Text style={styles.v}>{formatInr(details.emi.interestAmount)}</Text></View>
              {details.emi.lateFee > 0 && (
                <View style={styles.row}><Text style={styles.k}>Late Fee</Text><Text style={styles.v}>{formatInr(details.emi.lateFee)}</Text></View>
              )}
              {details.emi.gst > 0 && (
                <View style={styles.row}><Text style={styles.k}>GST</Text><Text style={styles.v}>{formatInr(details.emi.gst)}</Text></View>
              )}
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalK}>Total Payable</Text>
                <Text style={styles.totalV}>{formatInr(details.emi.totalPayable)}</Text>
              </View>
              <Text style={styles.statusPill}>
                {details.emi.paymentStatus}
              </Text>
            </View>

            {/* Payment History — identical paid-EMI ledger to the My EMIs tab / invoice */}
            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment History</Text>
                {history.map((p: any) => (
                  <View key={p.emiId ?? p.emiNumber} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.k}>EMI #{p.emiNumber}</Text>
                      <Text style={styles.dateSub}>{formatDate(p.paidDate ?? p.dueDate)}</Text>
                    </View>
                    <Text style={styles.historyAmt}>{formatInr(p.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Payment */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment</Text>
              <Text style={styles.methodLine}>
                {details.paymentMethod.provider} · {details.paymentMethod.label}
              </Text>
              <Pressable
                style={[styles.primaryBtn, (!details.canPay || paying) && { opacity: 0.5 }]}
                onPress={payNow}
                disabled={!details.canPay || paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>
                    {details.canPay ? `Pay Now · ${formatInr(details.paymentSummary.grandTotal)}` : 'Not Payable'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Razorpay checkout WebView */}
      {checkout && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setCheckout(null)}>
          <View style={styles.modalWrap}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Secure Payment · {formatInr(details?.emi?.totalPayable)}</Text>
              <Pressable onPress={() => setCheckout(null)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <PaymentWebView
              html={checkoutHtml}
              style={styles.webview}
              onMessage={handleWebViewMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  centerSub: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: Fonts.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  cardTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  k: { color: Colors.textSecondary, fontSize: Fonts.md },
  v: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: Fonts.medium },
  totalRow: { borderBottomWidth: 0, paddingTop: Spacing.md },
  totalK: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  totalV: { fontSize: Fonts.lg, fontWeight: Fonts.extraBold, color: Colors.primary },
  statusPill: { alignSelf: 'flex-start', marginTop: Spacing.sm, backgroundColor: Colors.warningLight, color: Colors.warning, fontSize: 11, fontWeight: Fonts.bold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, overflow: 'hidden' },
  dateSub: { color: Colors.textTertiary, fontSize: Fonts.xs, marginTop: 2 },
  historyAmt: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: Fonts.bold },
  methodLine: { color: Colors.textSecondary, fontSize: Fonts.md, marginBottom: Spacing.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.md, gap: Spacing.sm },
  primaryBtnTxt: { color: '#fff', fontWeight: Fonts.bold, fontSize: Fonts.md },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.md, gap: Spacing.sm },
  secondaryBtnTxt: { color: Colors.primary, fontWeight: Fonts.bold, fontSize: Fonts.md },
  errorTitle: { color: Colors.error, fontSize: Fonts.md, fontWeight: Fonts.semiBold, marginBottom: Spacing.md, textAlign: 'center' },
  successTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.success, textAlign: 'center', marginBottom: Spacing.sm },
  successAmt: { fontSize: Fonts.xl, fontWeight: Fonts.extraBold, color: Colors.textPrimary, textAlign: 'center', marginVertical: Spacing.sm },
  successSub: { color: Colors.textSecondary, fontSize: Fonts.sm, textAlign: 'center', marginBottom: 4 },
  modalWrap: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  webview: { flex: 1 },
});
