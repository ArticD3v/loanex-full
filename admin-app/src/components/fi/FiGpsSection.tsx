import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DetailRow } from '../ui/DetailRow';
import { SectionTitle } from '../ui/SectionTitle';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface FiGpsSectionProps {
  gpsCaptured: boolean;
  latitude: string;
  longitude: string;
  address: string;
  readOnly: boolean;
  onCapture: () => void;
}

export function FiGpsSection({
  gpsCaptured,
  latitude,
  longitude,
  address,
  readOnly,
  onCapture,
}: FiGpsSectionProps) {
  return (
    <Card style={styles.section}>
      <SectionTitle title="GPS Verification" />
      {!gpsCaptured && !readOnly && (
        <>
          <Text style={styles.helper}>Capture the current verification location.</Text>
          <Button title="Capture Current Location" variant="outline" onPress={onCapture} />
        </>
      )}
      {gpsCaptured && (
        <>
          <DetailRow label="Latitude" value={latitude || '—'} />
          <DetailRow label="Longitude" value={longitude || '—'} />
          <DetailRow label="Address" value={address || '—'} isLast />
          {!readOnly && (
            <Button
              title="Recapture Location"
              variant="outline"
              onPress={onCapture}
              style={styles.recapture}
            />
          )}
        </>
      )}
      {!gpsCaptured && readOnly && (
        <Text style={styles.helper}>No GPS location captured.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  helper: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  recapture: {
    marginTop: spacing.md,
  },
});
