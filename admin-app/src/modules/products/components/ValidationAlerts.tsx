import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ValidationAlert } from '../utils/productCalculations';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/spacing';

interface ValidationAlertsProps {
  alerts: ValidationAlert[];
}

export function ValidationAlerts({ alerts }: ValidationAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card style={styles.card} padding={spacing.md}>
        <Text style={styles.title}>Validation Alerts</Text>
        <View style={styles.successRow}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>No validation issues detected</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card} padding={spacing.md}>
      <Text style={styles.title}>Validation Alerts</Text>
      {alerts.map((alert) => (
        <View
          key={alert.id}
          style={[
            styles.alertRow,
            alert.severity === 'error' ? styles.alertError : styles.alertWarning,
          ]}
        >
          <Text style={styles.alertIcon}>{alert.severity === 'error' ? '!' : '⚠'}</Text>
          <Text
            style={[
              styles.alertText,
              alert.severity === 'error' ? styles.alertTextError : styles.alertTextWarning,
            ]}
          >
            {alert.message}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  successIcon: { color: colors.success, fontWeight: '700' },
  successText: { fontSize: 13, color: colors.success },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  alertError: { backgroundColor: colors.dangerLight },
  alertWarning: { backgroundColor: colors.warningLight },
  alertIcon: { fontSize: 14, fontWeight: '700' },
  alertText: { fontSize: 13, fontWeight: '600', flex: 1 },
  alertTextError: { color: colors.danger },
  alertTextWarning: { color: colors.warning },
});
