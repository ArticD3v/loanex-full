import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button } from '../ui/Button';
import { FiRoleCapabilities, DEFAULT_FI_ROLE_CAPABILITIES } from '../../types/roleCapabilities';
import { spacing } from '../../theme/spacing';

interface FiRoleActionsProps {
  /** Role-derived visibility flags. Defaults hide all role actions (read-only). */
  capabilities?: FiRoleCapabilities;
  onCapturePhoto?: () => void;
  onUploadPhoto?: () => void;
  onCaptureGps?: () => void;
  onEnterRemarks?: () => void;
  onSubmitFi?: () => void;
  onReview?: () => void;
  onApprove?: () => void;
  style?: ViewStyle;
}

/**
 * Reusable FI action strip for future role-based visibility.
 * Phase 1: capabilities default to false — no action buttons render.
 */
export function FiRoleActions({
  capabilities,
  onCapturePhoto,
  onUploadPhoto,
  onCaptureGps,
  onEnterRemarks,
  onSubmitFi,
  onReview,
  onApprove,
  style,
}: FiRoleActionsProps) {
  const caps = { ...DEFAULT_FI_ROLE_CAPABILITIES, ...capabilities };

  const actions: { key: string; visible: boolean; title: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'accent' }[] = [
    { key: 'capturePhoto', visible: caps.canCapturePhoto, title: 'Capture Photo', onPress: onCapturePhoto, variant: 'outline' },
    { key: 'uploadPhoto', visible: caps.canUploadPhoto, title: 'Upload Photo', onPress: onUploadPhoto, variant: 'outline' },
    { key: 'captureGps', visible: caps.canCaptureGps, title: 'Capture GPS', onPress: onCaptureGps, variant: 'outline' },
    { key: 'enterRemarks', visible: caps.canEnterRemarks, title: 'Enter Remarks', onPress: onEnterRemarks, variant: 'outline' },
    { key: 'submitFi', visible: caps.canSubmitFi, title: 'Submit FI', onPress: onSubmitFi, variant: 'primary' },
    { key: 'review', visible: caps.canReview, title: 'Review', onPress: onReview, variant: 'outline' },
    { key: 'approve', visible: caps.canApprove, title: 'Approve', onPress: onApprove, variant: 'accent' },
  ];

  const visibleActions = actions.filter((action) => action.visible);
  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, style]}>
      {visibleActions.map((action) => (
        <Button
          key={action.key}
          title={action.title}
          variant={action.variant}
          onPress={action.onPress ?? (() => undefined)}
          style={styles.btn}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  btn: {
    width: '100%',
  },
});
