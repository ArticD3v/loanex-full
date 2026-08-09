import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Pressable, Platform } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import { fetchDigiLockerDetails, extractNameFromDetails, extractAddressFromDetails, extractAadhaarFromDetails } from '../../services/digilockerService';

export type DigiLockerStatus = 'loading' | 'authenticating' | 'success' | 'error' | 'cancelled';

export interface VerifiedKYCData {
  name: string;
  aadhaarNumber: string;
  address: { fullAddress: string; city: string; state: string; pincode: string };
  raw: any;
  /** Optional identity fields some providers return alongside the Aadhaar number. */
  dob?: string;
  gender?: string;
  idNumber?: string;
}

interface DigiLockerAuthProps {
  visible: boolean;
  authUrl: string;
  clientId: string;
  prefillAadhaar?: string;
  onSuccess: (data: VerifiedKYCData) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  onClose: () => void;
}

/** Polling fallback for web — react-native-webview does not support web. */
function useWebDigiLocker(clientId: string, authUrl: string, onSuccess: (d: VerifiedKYCData) => void, onError: (e: string) => void) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const check = useCallback(async () => {
    if (doneRef.current) return;
    try {
      const result = await fetchDigiLockerDetails(clientId);
      if (result.status === 'ok' && result.data) {
        doneRef.current = true;
        stopPolling();
        onSuccess({
          name: extractNameFromDetails(result.data) || 'Verified User',
          aadhaarNumber: extractAadhaarFromDetails(result.data) || 'Verified',
          address: extractAddressFromDetails(result.data),
          raw: result.data,
        });
      }
      // Authorization pending — keep polling until the user completes login.
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (/not yet authorized|pending|incomplete/i.test(msg)) {
        return; // still waiting for the user in the popup
      }
      doneRef.current = true;
      stopPolling();
      onError(msg || 'Verification could not be completed');
    }
  }, [clientId, onSuccess, onError, stopPolling]);

  const start = useCallback(() => {
    doneRef.current = false;
    stopPolling();
    // Small delay so the popup has time to open before we start asking.
    timeoutRef.current = setTimeout(() => {
      void check();
      pollRef.current = setInterval(() => void check(), 3000);
    }, 2500);
    return stopPolling;
  }, [check, stopPolling]);

  return { start, check, stopPolling };
}

export default function DigiLockerAuth({
  visible,
  authUrl,
  clientId,
  prefillAadhaar,
  onSuccess,
  onCancel,
  onError,
  onClose,
}: DigiLockerAuthProps) {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<DigiLockerStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const detailsFetched = useRef(false);

  const isWeb = Platform.OS === 'web';
  const webFlow = useWebDigiLocker(
    clientId,
    authUrl,
    (data) => {
      setStatus('success');
      onSuccess(data);
    },
    (err) => {
      setStatus('error');
      setErrorMsg(err);
      onError(err);
    },
  );

  // Reset when opened
  React.useEffect(() => {
    if (visible) {
      setStatus('loading');
      setErrorMsg('');
      detailsFetched.current = false;
      if (isWeb && authUrl && clientId) {
        const cleanup = webFlow.start();
        // Open the popup right away on web.
        const t = setTimeout(() => {
          try { window.open(authUrl, '_blank'); } catch { /* popup blocked */ }
        }, 300);
        return () => { cleanup(); clearTimeout(t); };
      }
    } else {
      webFlow.stopPolling();
    }
  }, [visible, authUrl, clientId, isWeb]);

  // Detect navigation — when DigiLocker redirects to our callback URL, fetch details
  const handleNavigation = useCallback(async (nav: WebViewNavigation) => {
    const url = nav.url || '';
    const isCallback = url.includes('/digilocker/callback') || url.includes('callback') || url.includes('?code=') || url.includes('status=success');

    if (isCallback && !detailsFetched.current) {
      detailsFetched.current = true;
      setStatus('authenticating');
      try {
        const result = await fetchDigiLockerDetails(clientId);
        if (result.status === 'ok' && result.data) {
          const name = extractNameFromDetails(result.data);
          const aadhaarNumber = extractAadhaarFromDetails(result.data);
          const address = extractAddressFromDetails(result.data);
          setStatus('success');
          onSuccess({
            name: name || 'Verified User',
            aadhaarNumber: aadhaarNumber || 'Verified',
            address,
            raw: result.data,
          });
        } else {
          setStatus('error');
          setErrorMsg(result.error || 'Verification could not be completed');
          onError(result.error || 'Verification could not be completed');
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || 'Failed to fetch verified details');
        onError(e.message || 'Failed to fetch verified details');
      }
    }
  }, [clientId, onSuccess, onError]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onCancel}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>DigiLocker Verification</Text>
            <Text style={styles.subtitle}>Authenticate to verify your Aadhaar</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Body */}
        <View style={styles.content}>
          {status === 'loading' || status === 'authenticating' ? (
            <>
              {status === 'authenticating' && (
                <View style={styles.overlayMsg}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.overlayText}>Verifying your details...</Text>
                </View>
              )}
              {isWeb ? (
                <View style={styles.centerOverlay}>
                  <View style={styles.webIcon}>
                    <Text style={styles.webIconTxt}>🔐</Text>
                  </View>
                  <Text style={styles.webTitle}>DigiLocker opened in a new tab</Text>
                  <Text style={styles.webText}>
                    Complete your login and consent on the DigiLocker tab, then return here.
                    We'll detect it automatically.
                  </Text>
                  <Pressable style={styles.retryBtn} onPress={() => { try { window.open(authUrl, '_blank'); } catch { /* popup blocked */ } }}>
                    <Text style={styles.retryTxt}>Re-open DigiLocker</Text>
                  </Pressable>
                  <Pressable style={styles.webCheckBtn} onPress={() => webFlow.check()}>
                    <Text style={styles.webCheckTxt}>I've completed verification — check now</Text>
                  </Pressable>
                  <Text style={styles.webNote}>If the popup was blocked, tap "Re-open DigiLocker" above.</Text>
                </View>
              ) : authUrl ? (
                <WebView
                  ref={webViewRef}
                  source={{ uri: authUrl }}
                  style={styles.webview}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  injectedJavaScript={`
                    (function() {
                      var prefill = '${prefillAadhaar || ''}';
                      var hasClicked = false;
                      var hasFilledAadhaar = false;
                      setInterval(function() {
                        try {
                          if (!hasClicked) {
                            var cbs = document.querySelectorAll('input[type="checkbox"]');
                            if (cbs.length > 0) {
                              for (var i = 0; i < cbs.length; i++) {
                                var parentNode = cbs[i].parentElement || cbs[i].parentNode;
                                var text = parentNode ? (parentNode.innerText || '') : '';
                                if (text.includes('Aadhaar')) {
                                  if (!cbs[i].checked) cbs[i].click();
                                } else {
                                  if (cbs[i].checked) cbs[i].click();
                                }
                              }
                              hasClicked = true;
                            }
                          }
                          if (prefill && !hasFilledAadhaar) {
                            var inputs = document.querySelectorAll('input');
                            for (var j = 0; j < inputs.length; j++) {
                               var inp = inputs[j];
                               var attr = (inp.id + ' ' + inp.name + ' ' + (inp.placeholder || '')).toLowerCase();
                               if (attr.includes('aadhaar') || attr.includes('uid')) {
                                  if (inp.value !== prefill) {
                                     inp.value = prefill;
                                     inp.dispatchEvent(new Event('input', { bubbles: true }));
                                     inp.dispatchEvent(new Event('change', { bubbles: true }));
                                  }
                                  hasFilledAadhaar = true;
                               }
                            }
                          }
                        } catch (e) {}
                      }, 500);
                    })();
                    true;
                  `}
                  onNavigationStateChange={handleNavigation}
                  renderLoading={() => (
                    <View style={[styles.centerOverlay, StyleSheet.absoluteFill]}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Loading DigiLocker...</Text>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.centerOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Preparing verification...</Text>
                </View>
              )}
            </>
          ) : null}

          {status === 'success' && (
            <View style={styles.centerOverlay}>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>✅</Text>
              </View>
              <Text style={styles.successTitle}>Verified!</Text>
              <Text style={styles.successText}>Your Aadhaar was verified via DigiLocker.</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.centerOverlay}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorTitle}>Verification Failed</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Pressable style={styles.retryBtn} onPress={onCancel}>
                <Text style={styles.retryTxt}>Close</Text>
              </Pressable>
            </View>
          )}

          {status === 'cancelled' && (
            <View style={styles.centerOverlay}>
              <Text style={styles.errorTitle}>Cancelled</Text>
              <Pressable style={styles.retryBtn} onPress={onClose}>
                <Text style={styles.retryTxt}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Footer */}
        {(status === 'success' || status === 'error' || status === 'cancelled') && (
          <View style={styles.footer}>
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneTxt}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: Fonts.lg, color: Colors.textPrimary },
  title: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 1 },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#fff' },
  centerOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  loadingText: { fontSize: Fonts.md, color: Colors.textSecondary, marginTop: Spacing.lg },
  overlayMsg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  overlayText: { fontSize: Fonts.md, color: Colors.textSecondary },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.success, marginBottom: Spacing.sm },
  successText: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center' },
  errorEmoji: { fontSize: 48, marginBottom: Spacing.md },
  errorTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.error, marginBottom: Spacing.sm },
  errorText: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: Spacing.xl, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  retryTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },
  webIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  webIconTxt: { fontSize: 36 },
  webTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  webText: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  webCheckBtn: { marginTop: Spacing.lg, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  webCheckTxt: { color: Colors.primary, fontSize: Fonts.md, fontWeight: Fonts.bold, textAlign: 'center' },
  webNote: { fontSize: Fonts.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 17 },
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center' },
  doneTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
});
