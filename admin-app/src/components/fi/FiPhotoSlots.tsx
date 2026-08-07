import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SectionTitle } from '../ui/SectionTitle';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { FiPhotoKey, FI_PHOTO_LABELS } from '../../fi/data/fiWorkflowStore';

interface FiPhotoSlotsProps {
  photos: Record<FiPhotoKey, boolean>;
  readOnly: boolean;
  onCapture: (key: FiPhotoKey) => void;
  onRetake: (key: FiPhotoKey) => void;
}

const PHOTO_KEYS: FiPhotoKey[] = [
  'houseFront',
  'houseInside',
  'customerWithHouse',
  'businessShop',
  'customerSelfie',
];

export function FiPhotoSlots({ photos, readOnly, onCapture, onRetake }: FiPhotoSlotsProps) {
  return (
    <Card style={styles.section}>
      <SectionTitle title="Property Verification Photos" />
      {PHOTO_KEYS.map((key) => {
        const captured = photos[key];
        return (
          <View key={key} style={styles.photoCard}>
            <Text style={styles.photoLabel}>{FI_PHOTO_LABELS[key]}</Text>
            <View style={[styles.preview, captured && styles.previewCaptured]}>
              <Ionicons
                name={captured ? 'image-outline' : 'camera-outline'}
                size={36}
                color={captured ? colors.primary : colors.textMuted}
              />
              <Text style={styles.previewText}>
                {captured ? 'Photo captured (preview)' : 'No photo'}
              </Text>
            </View>
            {!readOnly && (
              <View style={styles.photoActions}>
                {!captured ? (
                  <Button
                    title="Capture Photo"
                    variant="outline"
                    size="sm"
                    onPress={() => onCapture(key)}
                    style={styles.photoBtn}
                  />
                ) : (
                  <>
                    <Button
                      title="Preview Photo"
                      variant="secondary"
                      size="sm"
                      onPress={() => undefined}
                      style={styles.photoBtn}
                    />
                    <Button
                      title="Retake Photo"
                      variant="outline"
                      size="sm"
                      onPress={() => onRetake(key)}
                      style={styles.photoBtn}
                    />
                  </>
                )}
              </View>
            )}
            {readOnly && captured && (
              <Text style={styles.readOnlyHint}>Submitted photo</Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  photoCard: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  preview: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewCaptured: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.secondaryLight,
  },
  previewText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoBtn: {
    flex: 1,
  },
  readOnlyHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
