import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { matchFace } from '../../services/faceService';

interface FaceVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Face verification — triggered on EVERY EMI application (whether KYC is done
 * or not) so we can confirm the person using the account is still the person
 * whose Aadhaar was verified. The backend POST /verification/face-match
 * compares the captured selfie against the Aadhaar profile photo.
 */
export default function FaceVerificationModal({
  visible,
  onClose,
  onSuccess,
}: FaceVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setLoading(false);
      setVerified(false);
    }
  }, [visible]);

  async function handleCapture() {
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

      setLoading(true);
      const matchResult = await matchFace(result.assets[0].base64);
      const ok =
        matchResult?.data?.match_status === true ||
        matchResult?.verified === true ||
        matchResult?.status?.code === 200;

      if (ok) {
        setVerified(true);
        onSuccess();
      } else {
        Alert.alert(
          'Match Failed',
          'Face match could not be confirmed. Please try again in better lighting.',
        );
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.message || 'Face verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="face-retouching-natural" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Verify it's you</Text>
          <Text style={styles.subtitle}>
            For your security, we verify your face against the Aadhaar photo on your
            account before every EMI application.
          </Text>

          {verified ? (
            <View style={styles.verifiedBox}>
              <MaterialIcons name="check-circle" size={22} color={Colors.success} />
              <Text style={styles.verifiedTxt}>Face verified</Text>
            </View>
          ) : (
            <Pressable style={[styles.faceBtn, loading && { opacity: 0.7 }]} onPress={handleCapture} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={40} color="#fff" />
                  <Text style={styles.faceBtnTxt}>Tap to scan your face</Text>
                </>
              )}
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.lg as object,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xl },
  faceBtn: {
    width: '100%',
    height: 170,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  faceBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  verifiedTxt: { fontSize: Fonts.md, color: Colors.success, fontWeight: Fonts.semiBold },
  actions: { width: '100%' },
  cancelBtn: { alignItems: 'center', padding: Spacing.md },
  cancelTxt: { color: Colors.textSecondary, fontSize: Fonts.md, fontWeight: Fonts.medium },
});
