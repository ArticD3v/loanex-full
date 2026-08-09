import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
  ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useKYC } from '../hooks/useKYC';
import * as ImagePicker from 'expo-image-picker';
import { fetchExperianReport } from '../services/kycService';
import { matchFace } from '../services/faceService';
import { createNotification } from '../services/notificationService';
import { generateDigiLockerToken } from '../services/digilockerService';
import DigiLockerAuth, { VerifiedKYCData } from '../components/feature/DigiLockerAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';

const STEPS = ['Aadhaar', 'Basic Details', 'Summary'];
const W = Dimensions.get('window').width;

/**
 * KYC flow — mirrors the website: DigiLocker Aadhaar verification FIRST,
 * then basic details (PAN) which fetches the CIBIL credit score, then a
 * summary showing the verified details. Face verification is included as the
 * final confirmation (app-only), and also re-triggers on every EMI
 * application via FaceVerificationModal.
 */
export default function KYCVerificationScreen() {
  const { user } = useAuth();
  const { kyc, kycLoading, isKYCComplete, refresh } = useKYC();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // DigiLocker real verification state
  const [digilockerVisible, setDigilockerVisible] = useState(false);
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [digilockerClientId, setDigilockerClientId] = useState('');

  // Aadhaar (from DigiLocker)
  const [aadharVerified, setAadharVerified] = useState(false);
  const [aadharLoading, setAadharLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedDob, setVerifiedDob] = useState('');
  const [verifiedGender, setVerifiedGender] = useState('');
  const [verifiedAadharNumber, setVerifiedAadharNumber] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const [digilockerData, setDigilockerData] = useState<any>(null);

  // Step state (declared unconditionally — React hooks must never sit after
  // an early return, or the verified read-only branch crashes on re-render).
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 2: Basic Details
  const [mobile, setMobile] = useState(user?.phone || '');
  const [pan, setPan] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [basicDetailsVerified, setBasicDetailsVerified] = useState(false);
  const [experianData, setExperianData] = useState<any>(null);
  const [cibilScore, setCibilScore] = useState<number>(0);

  // Face
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  // DatePicker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date(2000, 0, 1));

  // If KYC already completed, show read-only summary
  if (!kycLoading && isKYCComplete && kyc) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>KYC Already Verified</Text>
          </View>
        </View>
        <View style={styles.readonlyContainer}>
          <View style={styles.verifiedBigIcon}>
            <MaterialIcons name="verified" size={64} color={Colors.success} />
          </View>
          <Text style={styles.readonlyTitle}>Your identity is verified</Text>
          <Text style={styles.readonlySub}>KYC was completed on {kyc.kycCompletedAt ? new Date(kyc.kycCompletedAt).toLocaleDateString() : 'N/A'}</Text>

          <View style={styles.readonlyCard}>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>Full Name</Text>
              <Text style={styles.roValue}>{kyc.fullName}</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>Aadhaar Number</Text>
              <Text style={styles.roValue}>{kyc.aadharNumber}</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>PAN</Text>
              <Text style={styles.roValue}>{kyc.panNumber || 'Verified'}</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>CIBIL Score</Text>
              <Text style={[styles.roValue, { fontWeight: Fonts.bold, color: Colors.primary }]}>{kyc.cibilScore}</Text>
            </View>
          </View>

          <Text style={styles.readonlyNote}>KYC details cannot be edited after verification. Contact support if you need changes.</Text>

          <Pressable style={styles.nextBtn} onPress={() => router.back()}>
            <Text style={styles.nextBtnTxt}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      setDob(`${yyyy}-${mm}-${dd}`);
    }
  };

  const goToStep = (index: number) => {
    setStep(index);
    scrollRef.current?.scrollTo({ x: index * W, animated: true });
  };

  // ─── Step 1: Aadhaar (DigiLocker) — mirrors the website ────────────────
  const handleAadharVerify = async () => {
    setAadharLoading(true);
    try {
      const { url, client_id } = await generateDigiLockerToken();
      setDigilockerUrl(url);
      setDigilockerClientId(client_id);
      setDigilockerVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to initialize DigiLocker');
    }
    setAadharLoading(false);
  };

  const handleDigiLockerSuccess = (data: VerifiedKYCData) => {
    setDigilockerVisible(false);
    setVerifiedName(data.name || '');
    setVerifiedDob(data.dob || '');
    setVerifiedGender(data.gender || '');
    setVerifiedAadharNumber(data.aadhaarNumber || data.idNumber || 'XXXXXXXXXXXX');
    setVerifiedAddress(
      data.address?.fullAddress ||
      data.raw?.aadhaar_xml_data?.full_address ||
      '',
    );
    setDigilockerData(data.raw);
    // The backend already upserted customer_kyc (aadharVerified) in the fetch
    // call made by DigiLockerAuth — pre-fill the form from Aadhaar.
    if (data.name) {
      const parts = data.name.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
    if (data.dob) setDob(data.dob);
    setAadharVerified(true);
  };

  const handleDigiLockerCancel = () => setDigilockerVisible(false);
  const handleDigiLockerError = (err: string) => {
    setDigilockerVisible(false);
    Alert.alert('Verification Failed', err);
  };

  // ─── Step 2: Basic details + PAN + CIBIL (Experian) ────────────────────
  const handleVerifyBasicDetails = async () => {
    if (!aadharVerified) {
      Alert.alert('Incomplete', 'Please verify your Aadhaar first via DigiLocker.');
      return;
    }
    if (!pan || !firstName || !lastName || !dob) {
      Alert.alert('Incomplete', 'Please fill in your PAN, name and DOB.');
      return;
    }
    const formattedPan = pan.toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formattedPan)) {
      Alert.alert('Invalid PAN', 'PAN must be 10 characters (e.g. ABCDE1234F).');
      return;
    }
    if (!user) return;

    setLoading(true);
    // Live Experian credit report — the backend gates it on Aadhaar being
    // verified first (same as the web flow, and Aadhaar is step 1 here).
    const res = await fetchExperianReport({
      mobile, pan: formattedPan, firstName, lastName, dob, email, userId: user.id,
    });
    setLoading(false);

    if (res.success && res.data) {
      setExperianData(res.data);
      setCibilScore(res.data.bureau_score || 0);
      setBasicDetailsVerified(true);
    } else {
      Alert.alert(
        'Verification Failed',
        res.error || 'Unable to fetch your credit profile. Please check the details and try again.',
      );
    }
  };

  // ─── Step 3: Face verification (app-only) + Complete ───────────────────
  const handleFaceVerify = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to verify your face.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        base64: true,
        quality: 0.5,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        return; // user cancelled
      }

      setFaceLoading(true);
      const matchResult = await matchFace(result.assets[0].base64);
      if (
        matchResult?.data?.match_status === true ||
        matchResult?.verified === true ||
        matchResult?.status?.code === 200
      ) {
        setFaceVerified(true);
      } else {
        Alert.alert('Match Failed', 'Face match could not be confirmed. Please try again in better lighting.');
        setFaceVerified(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Face verification failed');
      setFaceVerified(false);
    } finally {
      setFaceLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!aadharVerified || !basicDetailsVerified) {
      Alert.alert('Incomplete', 'Please complete Aadhaar and basic details verification first.');
      return;
    }
    setSaving(true);
    try {
      // The backend persisted aadharVerified (digilocker fetch) and
      // pan_verified + cibil_score (experian) — refresh to confirm completion.
      await refresh();
      createNotification({
        userId: user.id,
        title: 'KYC Verified',
        message: `Your identity is verified. CIBIL score ${cibilScore}. You can now shop and use EMI options.`,
        type: 'kyc',
        route: '/(tabs)',
      });
      Alert.alert(
        'KYC Completed!',
        `Welcome, ${firstName}! Your account is fully verified.\n\n• Aadhaar: ✅ Verified\n• PAN & Credit: ✅ Verified\n• Score: ${cibilScore}\n• Face: ✅ Verified\n\nYou can now shop and use EMI options.`,
        [{ text: 'Start Shopping', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete KYC. Please try again.');
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
              i === step && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* Step 1: Aadhaar (DigiLocker) */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="badge" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Aadhaar Verification</Text>
          <Text style={styles.stepSub}>Verify your Aadhaar securely via DigiLocker — same as the website.</Text>

          {aadharVerified ? (
            <View style={{ width: '100%' }}>
              <View style={[styles.verifiedBox, { width: '100%' }]}>
                <MaterialIcons name="check-circle" size={24} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verifiedTxt, { fontSize: Fonts.md }]}>Aadhaar Verified</Text>
                  <Text style={{ fontFamily: 'Inter-Medium', color: Colors.textPrimary, fontSize: Fonts.lg, marginTop: 4 }}>{verifiedAadharNumber}</Text>
                  <Text style={styles.verifiedSub}>{verifiedName}</Text>
                </View>
              </View>

              <View style={styles.experianBox}>
                <Text style={styles.experianTitle}>Aadhaar Profile Details</Text>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Name</Text><Text style={styles.experianValue}>{digilockerData?.aadhaar_xml_data?.full_name || verifiedName}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>DOB</Text><Text style={styles.experianValue}>{digilockerData?.aadhaar_xml_data?.dob || verifiedDob}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Gender</Text><Text style={styles.experianValue}>{digilockerData?.aadhaar_xml_data?.gender || verifiedGender}</Text></View>
                {verifiedAddress ? (
                  <View style={styles.experianRow}><Text style={styles.experianLabel}>Address</Text><Text style={[styles.experianValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>{verifiedAddress}</Text></View>
                ) : null}
              </View>

              <Pressable style={styles.nextBtn} onPress={() => goToStep(1)}>
                <Text style={styles.nextBtnTxt}>Continue to Basic Details</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable style={styles.verifyBtn} onPress={handleAadharVerify} disabled={aadharLoading}>
                {aadharLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnTxt}>Verify Aadhaar via DigiLocker</Text>}
              </Pressable>
              <Text style={styles.stepNote}>
                You'll be redirected to DigiLocker to log in and share your Aadhaar.
              </Text>
            </>
          )}
        </View>

        {/* Step 2: Basic Details + CIBIL */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="person" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Basic Details</Text>
          <Text style={styles.stepSub}>We'll verify your PAN and fetch your CIBIL credit score securely.</Text>

          <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepFieldLabel}>Mobile No *</Text>
            <TextInput style={[styles.input, { flex: 1 }]} value={mobile} onChangeText={setMobile} placeholder="Mobile No" keyboardType="phone-pad" editable={false} />

            <Text style={styles.stepFieldLabel}>PAN Number *</Text>
            <TextInput style={styles.input} value={pan} onChangeText={t => setPan(t.toUpperCase())} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />

            <Text style={styles.stepFieldLabel}>First Name *</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />

            <Text style={styles.stepFieldLabel}>Last Name *</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />

            <Text style={styles.stepFieldLabel}>DOB *</Text>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <View pointerEvents="none">
                <TextInput style={styles.input} value={dob} placeholder="YYYY-MM-DD" editable={false} />
              </View>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}

            <Text style={styles.stepFieldLabel}>Email Address (Optional)</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />

            <Pressable
              style={[styles.verifyBtn, basicDetailsVerified && { backgroundColor: Colors.success }, !aadharVerified && styles.btnDisabled]}
              onPress={handleVerifyBasicDetails}
              disabled={loading || basicDetailsVerified || !aadharVerified}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnTxt}>{basicDetailsVerified ? 'Verified' : 'Verify PAN & Fetch CIBIL'}</Text>}
            </Pressable>

            {basicDetailsVerified && experianData && (
              <View style={styles.experianBox}>
                <Text style={styles.experianTitle}>Credit Profile Details</Text>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Name</Text><Text style={styles.experianValue}>{experianData.first_name} {experianData.last_name}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>DOB</Text><Text style={styles.experianValue}>{experianData.date_of_birth_applicant}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>PAN</Text><Text style={styles.experianValue}>{experianData.income_tax_pan}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Credit Score</Text><Text style={[styles.experianValue, { color: Colors.success, fontWeight: '700' }]}>{experianData.bureau_score || 'N/A'}</Text></View>
              </View>
            )}

            {basicDetailsVerified && (
              <Pressable style={styles.nextBtn} onPress={() => goToStep(2)}>
                <Text style={styles.nextBtnTxt}>Continue to Summary</Text>
              </Pressable>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* Step 3: Summary + Face Verification */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="verified" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Summary & Face Verification</Text>
          <Text style={styles.stepSub}>Review your verified details and confirm with a face scan.</Text>

          <View style={styles.experianBox}>
            <Text style={styles.experianTitle}>Verified Details</Text>
            <View style={styles.experianRow}><Text style={styles.experianLabel}>Name</Text><Text style={styles.experianValue}>{verifiedName || `${firstName} ${lastName}`}</Text></View>
            <View style={styles.experianRow}><Text style={styles.experianLabel}>Aadhaar</Text><Text style={styles.experianValue}>{verifiedAadharNumber}</Text></View>
            <View style={styles.experianRow}><Text style={styles.experianLabel}>PAN</Text><Text style={styles.experianValue}>{pan.toUpperCase()}</Text></View>
            <View style={styles.experianRow}><Text style={styles.experianLabel}>CIBIL Score</Text><Text style={[styles.experianValue, { color: Colors.success, fontWeight: '700' }]}>{cibilScore || 'N/A'}</Text></View>
          </View>

          {faceVerified ? (
            <View style={[styles.verifiedBox, { width: '100%' }]}>
              <MaterialIcons name="check-circle" size={20} color={Colors.success} />
              <Text style={styles.verifiedTxt}>Face verified successfully</Text>
            </View>
          ) : (
            <Pressable style={styles.faceBtn} onPress={handleFaceVerify} disabled={faceLoading}>
              {faceLoading ? (
                <ActivityIndicator color={Colors.primary} size="large" />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={48} color={Colors.primary} />
                  <Text style={styles.faceBtnTxt}>Tap to scan your face</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={[styles.nextBtn, (!faceVerified || saving) && styles.btnDisabled]}
            onPress={handleComplete}
            disabled={!faceVerified || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnTxt}>Complete KYC & Start Shopping</Text>}
          </Pressable>
        </View>
      </ScrollView>

      {/* DigiLocker Real Verification Modal */}
      <DigiLockerAuth
        visible={digilockerVisible}
        authUrl={digilockerUrl}
        clientId={digilockerClientId}
        onSuccess={handleDigiLockerSuccess}
        onCancel={handleDigiLockerCancel}
        onError={handleDigiLockerError}
        onClose={() => setDigilockerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.borderLight },
  progressDotActive: { backgroundColor: Colors.primaryLight },
  progressDotCurrent: { backgroundColor: Colors.primary, width: 24 },
  step: { width: W, padding: Spacing.xxl, alignItems: 'center' },
  stepIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg },
  stepTitle: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  stepSub: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xxl, lineHeight: 20 },
  stepNote: { fontSize: Fonts.sm, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  input: { width: '100%', backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  stepFieldLabel: { width: '100%', fontSize: Fonts.xs, color: Colors.textTertiary, fontWeight: Fonts.medium, marginBottom: 4, marginTop: 4 },
  verifiedSub: { fontSize: Fonts.xs, color: Colors.success, marginTop: 2 },
  nextBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  nextBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
  btnDisabled: { opacity: 0.5 },
  verifyBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
  verifyBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successLight, padding: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.md, width: '100%' },
  verifiedTxt: { fontSize: Fonts.md, color: Colors.success, fontWeight: Fonts.semiBold },
  faceBtn: { width: '100%', height: 200, backgroundColor: Colors.primary, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, gap: Spacing.sm },
  faceBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
  readonlyContainer: { flex: 1, alignItems: 'center', padding: Spacing.xxl },
  verifiedBigIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
  readonlyTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  readonlySub: { fontSize: Fonts.sm, color: Colors.textTertiary, marginBottom: Spacing.xxl },
  readonlyCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.sm, marginBottom: Spacing.lg },
  readonlyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  roLabel: { fontSize: Fonts.md, color: Colors.textSecondary },
  roValue: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  readonlyNote: { fontSize: Fonts.sm, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  experianBox: { marginTop: Spacing.xl, padding: Spacing.lg, backgroundColor: '#ffffff', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', ...Shadow.sm },
  experianTitle: { fontSize: Fonts.md, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: Spacing.sm },
  experianRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  experianLabel: { fontSize: Fonts.sm, color: Colors.textSecondary, width: 80 },
  experianValue: { fontSize: Fonts.sm, color: Colors.textPrimary, fontFamily: 'Inter-SemiBold', flex: 1, textAlign: 'right' },
});
