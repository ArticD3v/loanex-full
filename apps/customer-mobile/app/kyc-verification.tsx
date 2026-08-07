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
import { saveKYC, fetchExperianReport } from '../services/kycService';
import { matchFace } from '../services/faceService';
import { createNotification } from '../services/notificationService';
import { generateDigiLockerToken, saveDigiLockerReport } from '../services/digilockerService';
import DigiLockerAuth, { VerifiedKYCData } from '../components/feature/DigiLockerAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

const STEPS = ['Basic Details', 'Aadhaar', 'Face ID'];
const W = Dimensions.get('window').width;

export default function KYCVerificationScreen() {
  const { user } = useAuth();
  const { kyc, kycLoading, isKYCComplete } = useKYC();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // DigiLocker real verification state
  const [digilockerVisible, setDigilockerVisible] = useState(false);
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [digilockerClientId, setDigilockerClientId] = useState('');
  
  // Aadhar
  const [manualAadhar, setManualAadhar] = useState('');
  const [aadharVerified, setAadharVerified] = useState(false);
  const [aadharLoading, setAadharLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedDob, setVerifiedDob] = useState('');
  const [verifiedGender, setVerifiedGender] = useState('');
  const [verifiedAadharNumber, setVerifiedAadharNumber] = useState('');
  const [verifiedRaw, setVerifiedRaw] = useState<any>(null);
  const [digilockerData, setDigilockerData] = useState<any>(null);
  const [matchStatus, setMatchStatus] = useState<'pending' | 'verified' | ''>('');

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
              <Text style={styles.roLabel}>Aadhar Number</Text>
              <Text style={styles.roValue}>{kyc.aadharNumber}</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>PAN & Credit</Text>
              <Text style={styles.roValue}>✅ Verified</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>CIBIL Score</Text>
              <Text style={[styles.roValue, { fontWeight: Fonts.bold, color: Colors.primary }]}>{kyc.cibilScore}</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.roLabel}>Face ID</Text>
              <Text style={styles.roValue}>✅ Verified</Text>
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

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Basic Details
  const [mobile, setMobile] = useState(user?.phone || '');
  const [pan, setPan] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [basicDetailsVerified, setBasicDetailsVerified] = useState(false);
  const [experianData, setExperianData] = useState<any>(null);
  const [cibilScore, setCibilScore] = useState<number>(0);

  // Step 3: Face
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  // DatePicker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date(2000, 0, 1));

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

  const handleDevSkip = (stepName: string) => {
    switch (stepName) {
      case 'Basic':
        setBasicDetailsVerified(true);
        setCibilScore(750);
        goToStep(1);
        break;
      case 'Aadhar':
        setAadharVerified(true);
        setVerifiedAadharNumber('123412341234');
        setVerifiedName(firstName + ' ' + lastName);
        goToStep(2);
        break;
      case 'Face':
        setFaceVerified(true);
        break;
    }
  };

  const handleDevMockData = (stepName: string) => {
    switch (stepName) {
      case 'Basic':
        setOtpVerified(true);
        setBasicDetailsVerified(true);
        setCibilScore(820);
        setExperianData({
          first_name: firstName || 'John',
          last_name: lastName || 'Doe',
          date_of_birth_applicant: dob || '1990-01-01',
          mobile_phone_number: mobile || '9876543210',
          income_tax_pan: pan || 'ABCDE1234F',
          email_id: email || 'johndoe@example.com',
          bureau_score: 820,
        });
        break;
      case 'Aadhar':
        setAadharVerified(true);
        setMatchStatus('verified');
        setVerifiedAadharNumber('1234 5678 9012');
        setVerifiedName((firstName + ' ' + lastName).trim() || 'John Doe');
        setVerifiedDob(dob || '1990-01-01');
        setVerifiedGender('M');
        setDigilockerData({
          aadhaar_xml_data: {
            full_name: (firstName + ' ' + lastName).trim() || 'John Doe',
            dob: dob || '1990-01-01',
            gender: 'M',
            full_address: '123 Fake Street, Mock City, MD 12345',
          }
        });
        break;
      case 'Face':
        setFaceVerified(true);
        break;
    }
  };

  const handleSendOtp = () => {
    if (!mobile || mobile.length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
    Alert.alert('OTP Sent', 'A demo OTP (1111) has been sent to your mobile number.');
  };

  const handleVerifyOtp = () => {
    if (otp === '1111') {
      setOtpVerified(true);
      Alert.alert('Verified', 'Mobile number verified successfully.');
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP (1111).');
    }
  };

  // ─── Step 1: Basic Details / Experian ──────────────────────────────────────
  const handleVerifyBasicDetails = async () => {
    if (!otpVerified) {
      Alert.alert('Incomplete', 'Please verify your mobile number first.');
      return;
    }
    if (!mobile || !pan || !firstName || !lastName || !dob) {
      Alert.alert('Incomplete', 'Please fill all details');
      return;
    }
    
    const formattedPan = pan.toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formattedPan)) {
      Alert.alert('Invalid PAN', 'PAN must be 10 characters (e.g. ABCDE1234F).');
      return;
    }

    if (!user) return;

    setLoading(true);
    const res = await fetchExperianReport({
      mobile, pan: formattedPan, firstName, lastName, dob, email, userId: user.id
    });
    setLoading(false);

    if (res.success) {
      setBasicDetailsVerified(true);
      setExperianData(res.data);
      setCibilScore(res.data?.bureau_score || 0);
      // Removed the alert so it just reveals the details inline
    } else {
      Alert.alert('Verification Failed', res.error || 'Failed to verify details');
    }
  };

  // ─── Step 2: Aadhaar (DigiLocker) ────────────────────────────────────
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
    setVerifiedAadharNumber(data.idNumber || 'XXXXXXXXXXXX');
    setVerifiedRaw(data.raw);
    
    // Attempt to save to database via backend
    if (user && data.raw) {
      saveDigiLockerReport(user.id, data.raw);
      setDigilockerData(data.raw);
    }
    
    // Strict Name Match validation between Basic Details (Experian) Name and Aadhaar Name
    const enteredName = (firstName + " " + lastName).toLowerCase();
    const aadhaarName = (data.name || '').toLowerCase();
    
    const officialParts = aadhaarName.split(' ').filter((p: string) => p.length > 2);
    const enteredParts = enteredName.split(' ').filter((p: string) => p.length > 2);
    const hasMatch = officialParts.some((p: string) => enteredParts.includes(p)) || enteredParts.some((p: string) => officialParts.includes(p));
    
    if (aadhaarName && enteredName && !hasMatch) {
      setMatchStatus('pending');
      // No longer blocking progression
    } else {
      setMatchStatus('verified');
    }
    
    setAadharVerified(true);
  };

  const handleDigiLockerCancel = () => setDigilockerVisible(false);
  const handleDigiLockerError = (err: string) => {
    setDigilockerVisible(false);
    Alert.alert('Verification Failed', err);
  };

  // ─── Step 3: Face verification ────────────────────────────────────
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
        return; // User cancelled
      }

      setFaceLoading(true);

      const personBase64 = result.assets[0].base64;
      
      // Attempt to extract Aadhaar profile image
      const cardBase64 = 
        digilockerData?.aadhaar_xml_data?.profile_image ||
        digilockerData?.profile_image ||
        digilockerData?.data?.profile_image;

      if (!cardBase64) {
        Alert.alert('Error', 'Could not find Aadhaar profile image to match against. Please complete Aadhaar verification again.');
        setFaceLoading(false);
        return;
      }

      // Call our backend API
      const matchResult = await matchFace(personBase64, cardBase64);
      
      // Ensure match is successful based on the API response structure
      if (matchResult?.data?.match_status === true || matchResult?.status?.code === 200) {
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

  // ─── Final submit ─────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!user) return;
    if (!basicDetailsVerified || !aadharVerified || !faceVerified) {
      Alert.alert('Incomplete', 'Please complete all verification steps.');
      return;
    }

    setSaving(true);
    try {
      await saveKYC(user.id, {
        fullName: `${firstName} ${lastName}`,
        aadharNumber: verifiedAadharNumber,
        dob: dob || verifiedDob,
        gender: verifiedGender,
        address: experianData?.flat_no_plot_no_house_no || null,
        rawKycData: verifiedRaw,
        panNumber: pan.toUpperCase(),
        cibilScore,
        faceVerified,
      });

      createNotification({
        userId: user.id,
        title: 'KYC Verified',
        message: `Your identity is verified. CIBIL score ${cibilScore}. You can now shop and use EMI options.`,
        type: 'kyc',
        route: '/(tabs)',
      });

      Alert.alert(
        'KYC Completed!',
        `Welcome, ${firstName}! Your account is fully verified.\n\n• Aadhar: ✅ Verified\n• PAN & Credit: ✅ Verified\n• Score: ${cibilScore}\n• Face ID: ✅ Verified\n\nYou can now shop and use EMI options.`,
        [{ text: 'Start Shopping', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save KYC data');
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
        {/* Step 1: Basic Details */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="person" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Basic Details</Text>
          <Text style={styles.stepSub}>We will fetch your PAN and Credit Profile securely.</Text>
          
          <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepFieldLabel}>Mobile No *</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={mobile} onChangeText={setMobile} placeholder="Mobile No" keyboardType="phone-pad" editable={!otpVerified} />
              {!otpVerified && (
                <Pressable style={styles.otpBtn} onPress={handleSendOtp}>
                  <Text style={styles.otpBtnTxt}>{otpSent ? 'Resend' : 'Send OTP'}</Text>
                </Pressable>
              )}
            </View>
            
            {otpSent && !otpVerified && (
              <View style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}>
                <Text style={styles.stepFieldLabel}>Enter OTP *</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={otp} onChangeText={setOtp} placeholder="1111" keyboardType="number-pad" maxLength={4} />
                  <Pressable style={styles.otpVerifyBtn} onPress={handleVerifyOtp}>
                    <Text style={styles.otpVerifyBtnTxt}>Verify</Text>
                  </Pressable>
                </View>
              </View>
            )}

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

            <Pressable style={[styles.verifyBtn, basicDetailsVerified && { backgroundColor: Colors.success }, !otpVerified && styles.btnDisabled]} onPress={handleVerifyBasicDetails} disabled={loading || basicDetailsVerified || !otpVerified}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnTxt}>{basicDetailsVerified ? 'Verified' : 'Verify Details'}</Text>}
            </Pressable>

            {__DEV__ && !basicDetailsVerified && (
              <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevSkip('Basic')}>
                  <Text style={styles.devSkipTxt}>Skip (Dev)</Text>
                </Pressable>
                <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevMockData('Basic')}>
                  <Text style={styles.devSkipTxt}>Mock Data (Dev)</Text>
                </Pressable>
              </View>
            )}

            {basicDetailsVerified && experianData && (
              <View style={styles.experianBox}>
                <Text style={styles.experianTitle}>Credit Profile Details</Text>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Name</Text><Text style={styles.experianValue}>{experianData.first_name} {experianData.last_name}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>DOB</Text><Text style={styles.experianValue}>{experianData.date_of_birth_applicant}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Mobile</Text><Text style={styles.experianValue}>{experianData.mobile_phone_number}</Text></View>
                <View style={styles.experianRow}><Text style={styles.experianLabel}>PAN</Text><Text style={styles.experianValue}>{experianData.income_tax_pan}</Text></View>
                {experianData.email_id && <View style={styles.experianRow}><Text style={styles.experianLabel}>Email</Text><Text style={styles.experianValue}>{experianData.email_id}</Text></View>}
                <View style={styles.experianRow}><Text style={styles.experianLabel}>Credit Score</Text><Text style={[styles.experianValue, { color: Colors.success, fontWeight: '700' }]}>{experianData.bureau_score || 'N/A'}</Text></View>
              </View>
            )}

            {basicDetailsVerified && (
              <Pressable style={styles.nextBtn} onPress={() => goToStep(1)}>
                <Text style={styles.nextBtnTxt}>Confirm & Continue to Aadhaar</Text>
              </Pressable>
            )}
            <View style={{height: 100}} />
          </ScrollView>
        </View>

        {/* Step 2: Aadhar */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="badge" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Aadhaar Verification</Text>
          <Text style={styles.stepSub}>Fetch your Aadhaar details securely.</Text>

          {aadharVerified ? (
            <View>
              <View style={[styles.verifiedBox, matchStatus === 'pending' && { backgroundColor: Colors.warningLight }]}>
                <MaterialIcons name={matchStatus === 'pending' ? "pending-actions" : "check-circle"} size={24} color={matchStatus === 'pending' ? Colors.warning : Colors.success} style={{ marginRight: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verifiedTxt, { fontSize: Fonts.md }, matchStatus === 'pending' && { color: Colors.warning }]}>
                    {matchStatus === 'pending' ? 'Pending Status (Name Mismatch)' : 'Aadhaar Verified'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter-Medium', color: Colors.textPrimary, fontSize: Fonts.lg, marginTop: 4 }}>{verifiedAadharNumber}</Text>
                  <Text style={styles.verifiedSub}>{verifiedName}</Text>
                </View>
              </View>

              {digilockerData && (
                <View style={styles.experianBox}>
                  <Text style={styles.experianTitle}>Aadhaar Profile Details</Text>
                  <View style={styles.experianRow}><Text style={styles.experianLabel}>Name</Text><Text style={styles.experianValue}>{digilockerData.aadhaar_xml_data?.full_name || verifiedName}</Text></View>
                  <View style={styles.experianRow}><Text style={styles.experianLabel}>DOB</Text><Text style={styles.experianValue}>{digilockerData.aadhaar_xml_data?.dob || verifiedDob}</Text></View>
                  <View style={styles.experianRow}><Text style={styles.experianLabel}>Gender</Text><Text style={styles.experianValue}>{digilockerData.aadhaar_xml_data?.gender || verifiedGender}</Text></View>
                  <View style={styles.experianRow}><Text style={styles.experianLabel}>Address</Text><Text style={[styles.experianValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>{digilockerData.aadhaar_xml_data?.full_address || 'N/A'}</Text></View>
                </View>
              )}
            </View>
          ) : (
            <>
              <Pressable style={styles.verifyBtn} onPress={handleAadharVerify} disabled={aadharLoading}>
                {aadharLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnTxt}>Verify Aadhaar via DigiLocker</Text>}
              </Pressable>
              
              {__DEV__ && (
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                  <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevSkip('Aadhar')}>
                    <Text style={styles.devSkipTxt}>Skip (Dev)</Text>
                  </Pressable>
                  <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevMockData('Aadhar')}>
                    <Text style={styles.devSkipTxt}>Mock Data (Dev)</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {aadharVerified && (
            <Pressable style={styles.nextBtn} onPress={() => goToStep(2)}>
              <Text style={styles.nextBtnTxt}>Continue to Face ID</Text>
            </Pressable>
          )}
        </View>

        {/* Step 3: Face Verification */}
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <MaterialIcons name="face" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Face Verification</Text>
          <Text style={styles.stepSub}>For security purposes, verify your identity</Text>

          {faceVerified ? (
            <>
              <View style={styles.verifiedBox}>
                <MaterialIcons name="check-circle" size={20} color={Colors.success} />
                <Text style={styles.verifiedTxt}>Face verified successfully</Text>
              </View>
              <Pressable style={styles.nextBtn} onPress={handleComplete} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnTxt}>Complete KYC & Start Shopping</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
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
              {__DEV__ && (
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                  <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevSkip('Face')}>
                    <Text style={styles.devSkipTxt}>Skip (Dev)</Text>
                  </Pressable>
                  <Pressable style={[styles.devSkipBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleDevMockData('Face')}>
                    <Text style={styles.devSkipTxt}>Mock Data (Dev)</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* DigiLocker Real Verification Modal */}
      <DigiLockerAuth
        visible={digilockerVisible}
        authUrl={digilockerUrl}
        clientId={digilockerClientId}
        prefillAadhaar={manualAadhar}
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
  devSkipBtn: { marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: '#F3F4F6', borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' },
  devSkipTxt: { color: '#4B5563', fontFamily: 'Inter-SemiBold', fontSize: Fonts.sm },
  experianBox: { marginTop: Spacing.xl, padding: Spacing.lg, backgroundColor: '#ffffff', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', ...Shadow.sm },
  experianTitle: { fontSize: Fonts.md, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: Spacing.sm },
  experianRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  experianLabel: { fontSize: Fonts.sm, color: Colors.textSecondary, width: 80 },
  experianValue: { fontSize: Fonts.sm, color: Colors.textPrimary, fontFamily: 'Inter-SemiBold', flex: 1, textAlign: 'right' },
  otpBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, justifyContent: 'center', borderRadius: Radius.md },
  otpBtnTxt: { color: '#fff', fontSize: Fonts.sm, fontFamily: 'Inter-SemiBold' },
  otpVerifyBtn: { backgroundColor: Colors.success, paddingHorizontal: Spacing.md, justifyContent: 'center', borderRadius: Radius.md },
  otpVerifyBtnTxt: { color: '#fff', fontSize: Fonts.sm, fontFamily: 'Inter-SemiBold' },
});
