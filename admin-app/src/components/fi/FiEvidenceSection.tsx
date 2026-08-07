import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '../ui/Card';
import { DetailRow } from '../ui/DetailRow';
import { SectionTitle } from '../ui/SectionTitle';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';

interface FiEvidenceSectionProps {
  photoCount?: number;
  gpsLocation?: string;
  remarks?: string;
}

/**
 * Read-only FI evidence blocks (Photos / GPS / Remarks).
 * Prepared for future Sales Executive capture/upload actions.
 */
export function FiEvidenceSection({
  photoCount = 0,
  gpsLocation,
  remarks,
}: FiEvidenceSectionProps) {
  const colors = useTheme();

  return (
    <>
      <Card style={styles.section}>
        <SectionTitle title="Photos" />
        <View style={[styles.photoPlaceholder, { backgroundColor: colors.primaryLight, borderColor: colors.borderLight }]}>
          <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            {photoCount > 0 ? `${photoCount} photo(s) attached` : 'No photos attached'}
          </Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionTitle title="GPS" />
        <DetailRow label="Location" value={gpsLocation?.trim() ? gpsLocation : '—'} isLast />
      </Card>

      <Card style={styles.section}>
        <SectionTitle title="Remarks" />
        <Text style={[styles.remarks, { color: colors.text }]}>
          {remarks?.trim() ? remarks : '—'}
        </Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center',
  },
  remarks: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
