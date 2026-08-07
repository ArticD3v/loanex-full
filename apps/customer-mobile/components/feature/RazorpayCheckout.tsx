import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Pressable } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import { generateCheckoutHTML, PaymentResult, verifyRazorpayPayment, createRazorpayOrder } from '../../services/razorpayService';
import { RAZORPAY_CONFIG } from '../../constants/config';

export type RazorpayStatus = 'idle' | 'creating_order' | 'ready' | 'success' | 'failed' | 'cancelled' | 'error';

interface RazorpayCheckoutProps {
  visible: boolean;
  amount: number;           // Amount in ₹ (will be converted to paise)
  currency?: string;
  description?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (result: PaymentResult) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  onClose: () => void;
  /** When true, shows "Use Demo Payment" fallback when the server is unreachable */
  allowDemoFallback?: boolean;
  /** Called when user taps demo fallback */
  onDemoFallback?: () => void;
}

export default function RazorpayCheckout({
  visible,
  amount,
  currency = 'INR',
  description = 'Payment for Order',
  prefillEmail = '',
  prefillContact = '',
  onSuccess,
  onCancel,
  onError,
  onClose,
  allowDemoFallback = false,
  onDemoFallback,
}: RazorpayCheckoutProps) {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<RazorpayStatus>('idle');
  const [checkoutHTML, setCheckoutHTML] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const serverUrl = RAZORPAY_CONFIG.serverUrl;

  // Create order + prepare checkout HTML
  const initializeCheckout = useCallback(async () => {
    if (!visible) return;

    setStatus('creating_order');
    setErrorMsg('');

    try {
      const order = await createRazorpayOrder(amount, currency);
      const name = 'LoanEx';

      const html = generateCheckoutHTML({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name,
        description: `${description} - ₹${amount.toFixed(2)}`,
        prefill_email: prefillEmail,
        prefill_contact: prefillContact,
        theme_color: Colors.primary,
      });

      setCheckoutHTML(html);
      setStatus('ready');
    } catch (err: any) {
      const msg = err.message || 'Failed to initialize payment';
      setErrorMsg(msg);
      setStatus('error');
      onError(msg);
    }
  }, [visible, amount, currency, description, prefillEmail, prefillContact, onError]);

  // Reset + initialize when modal opens
  React.useEffect(() => {
    if (visible) {
      setStatus('idle');
      setCheckoutHTML('');
      setErrorMsg('');
      // Small delay to allow modal to animate in
      const t = setTimeout(() => initializeCheckout(), 300);
      return () => clearTimeout(t);
    }
  }, [visible, initializeCheckout]);

  // Handle messages from WebView
  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let data: any;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    switch (data.event) {
      case 'payment.success':
        setStatus('success');
        // Verify signature on our backend
        try {
          await verifyRazorpayPayment(
            data.razorpay_order_id,
            data.razorpay_payment_id,
            data.razorpay_signature
          );
        } catch (err: any) {
          // Verification failed - still tell the user but log the issue
          console.warn('[Razorpay] Signature verification failed:', err.message);
        }
        onSuccess({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
        });
        break;

      case 'payment.cancelled':
        setStatus('cancelled');
        onCancel();
        break;

      case 'payment.failed':
        setStatus('failed');
        setErrorMsg(data.error_description || 'Payment failed');
        onError(data.error_description || 'Payment failed');
        break;

      case 'payment.error':
        setStatus('error');
        setErrorMsg(data.message || 'An error occurred');
        onError(data.message || 'An error occurred');
        break;
    }
  }, [onSuccess, onCancel, onError]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Secure Payment</Text>
          <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Loading states */}
          {(status === 'idle' || status === 'creating_order') && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.statusText}>Initializing payment...</Text>
            </View>
          )}

          {/* WebView checkout */}
          {status === 'ready' && checkoutHTML && (
            <WebView
              ref={webViewRef}
              source={{ html: checkoutHTML, baseUrl: 'https://loanex.app' }}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleMessage}
              startInLoadingState
              onShouldStartLoadWithRequest={(request) => {
                // If it's a standard web URL, let WebView handle it
                if (request.url.startsWith('http://') || request.url.startsWith('https://') || request.url.startsWith('about:')) {
                  return true;
                }
                // If it's a deep link (upi://, tez://, paytm://, etc), open it in the OS
                import('react-native').then(({ Linking }) => {
                  Linking.canOpenURL(request.url).then((supported) => {
                    if (supported) {
                      Linking.openURL(request.url);
                    } else {
                      console.warn('Cannot open URI: ' + request.url);
                    }
                  });
                });
                return false;
              }}
              renderLoading={() => (
                <View style={[styles.center, StyleSheet.absoluteFill]}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.statusText}>Loading payment gateway...</Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('[Razorpay] WebView error:', nativeEvent.description);
              }}
            />
          )}

          {/* Error state */}
          {status === 'error' && (
            <View style={styles.center}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Text style={styles.serverHint}>
                Server URL: {serverUrl}{'\n'}
                Make sure the server is running: npm run server
              </Text>
              <Pressable style={styles.retryBtn} onPress={initializeCheckout}>
                <Text style={styles.retryBtnTxt}>Retry</Text>
              </Pressable>
              {allowDemoFallback && onDemoFallback && (
                <Pressable style={styles.demoFallbackBtn} onPress={onDemoFallback}>
                  <Text style={styles.demoFallbackTxt}>Use Demo Payment Instead</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Cancelled */}
          {status === 'cancelled' && (
            <View style={styles.center}>
              <Text style={styles.statusIcon}>❌</Text>
              <Text style={styles.errorTitle}>Payment Cancelled</Text>
              <Text style={styles.errorText}>You cancelled the payment.</Text>
            </View>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <View style={styles.center}>
              <Text style={styles.statusIcon}>❌</Text>
              <Text style={styles.errorTitle}>Payment Failed</Text>
              <Text style={styles.errorText}>{errorMsg || 'Transaction failed. Please try again.'}</Text>
              <Pressable style={styles.retryBtn} onPress={initializeCheckout}>
                <Text style={styles.retryBtnTxt}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Success */}
          {status === 'success' && (
            <View style={styles.center}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successText}>Your payment has been processed.</Text>
            </View>
          )}
        </View>

        {/* Footer — always show close */}
        {(status === 'success' || status === 'error' || status === 'cancelled' || status === 'failed') && (
          <View style={styles.footer}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnTxt}>
                {status === 'success' ? 'Continue' : 'Close'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'center',
  },
  title: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  amount: { fontSize: Fonts.xxxl, fontWeight: Fonts.extraBold, color: Colors.primary, marginTop: 4 },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  statusText: { fontSize: Fonts.md, color: Colors.textSecondary, marginTop: Spacing.lg },
  statusIcon: { fontSize: 48, marginBottom: Spacing.md },
  errorIcon: { fontSize: 48, marginBottom: Spacing.md },
  errorTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.error, marginBottom: Spacing.sm },
  errorText: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  retryBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },
  serverHint: { fontSize: Fonts.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  demoFallbackBtn: { marginTop: Spacing.md, padding: Spacing.md },
  demoFallbackTxt: { fontSize: Fonts.md, color: Colors.primary, fontWeight: Fonts.medium },
  successIcon: { fontSize: 64, marginBottom: Spacing.md },
  successTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.success, marginBottom: Spacing.sm },
  successText: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center' },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  closeBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
});
