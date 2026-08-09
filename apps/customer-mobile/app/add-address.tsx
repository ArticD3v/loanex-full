import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { addAddress } from '../services/addressService';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';

const LABELS = ['Home', 'Work', 'Other'];

export default function AddAddressScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!fullAddress.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await addAddress(user.id, {
        label,
        fullAddress: fullAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault,
      });
      Alert.alert('Success', 'Address saved successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Add Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.sectionTitle}>Address Label</Text>
        <View style={styles.labelRow}>
          {LABELS.map(l => (
            <Pressable
              key={l}
              style={[styles.labelChip, label === l && styles.labelChipOn]}
              onPress={() => setLabel(l)}
            >
              <Text style={[styles.labelChipTxt, label === l && styles.labelChipTxtOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Full Address *</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={fullAddress}
          onChangeText={setFullAddress}
          placeholder="House/Flat No., Street, Area"
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>City *</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={Colors.textTertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>State *</Text>
            <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="State" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Pincode *</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={t => setPincode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit pincode"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Pressable style={styles.defaultRow} onPress={() => setIsDefault(v => !v)}>
          <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
            {isDefault && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.defaultTxt}>Set as default address</Text>
        </Pressable>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnTxt}>{saving ? 'Saving...' : 'Save Address'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  form: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 100 },
  sectionTitle: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  labelRow: { flexDirection: 'row', gap: Spacing.sm },
  labelChip: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border },
  labelChipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  labelChipTxt: { fontSize: Fonts.md, fontWeight: Fonts.medium, color: Colors.textSecondary },
  labelChipTxtOn: { color: Colors.primary, fontWeight: Fonts.semiBold },
  fieldLabel: { fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  defaultTxt: { fontSize: Fonts.md, color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
});
