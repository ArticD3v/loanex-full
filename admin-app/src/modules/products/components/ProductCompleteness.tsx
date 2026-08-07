import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompletenessSection } from '../utils/productCalculations';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/spacing';

interface ProductCompletenessProps {
  sections: CompletenessSection[];
  overall: number;
}

export function ProductCompleteness({ sections, overall }: ProductCompletenessProps) {
  return (
    <Card style={styles.card} padding={spacing.md}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Completeness</Text>
        <View style={styles.overallBadge}>
          <Text style={styles.overallText}>{overall}%</Text>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.key} style={styles.row}>
          <Text style={styles.label}>{section.label}</Text>
          <View style={styles.barWrap}>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${section.percent}%`,
                    backgroundColor:
                      section.key === 'emi'
                        ? colors.accent
                        : section.percent === 100
                          ? colors.accent
                          : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.percent}>{section.percent}%</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  overallBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  overallText: { fontSize: 13, fontWeight: '800', color: colors.accentDark },
  row: { marginBottom: spacing.sm },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full },
  percent: { fontSize: 11, fontWeight: '700', color: colors.text, width: 36, textAlign: 'right' },
});
