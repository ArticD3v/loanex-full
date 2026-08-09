import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { EMIPlan } from '../../types';
import { EMI_RATES, calculateEMI, APP_CONFIG } from '../../constants/config';

interface Props { price: number; selectedPlan: EMIPlan | null; onSelectPlan: (plan: EMIPlan | null) => void; }

export function EMICalculator({ price, selectedPlan, onSelectPlan }: Props) {
  const plans = useMemo((): EMIPlan[] =>
    EMI_RATES.map(({ months, annualRate }) => {
      const { monthlyAmount, totalAmount, processingFee } = calculateEMI(price, annualRate, months);
      return {
        months,
        interestRate: annualRate,
        monthlyAmount,
        totalAmount,
        processingFee,
        // The calculator has no down-payment input, so the whole price is financed.
        loanAmount: price,
        upfrontPayment: processingFee,
        totalPayable: totalAmount,
        loanTotal: totalAmount,
        grandTotal: totalAmount,
      };
    }), [price]);

  return (
    <View>
      <Text style={styles.title}>Choose EMI Plan</Text>
      <Text style={styles.subtitle}>Zero foreclosure charges · Instant approval</Text>
      {plans.map(plan => {
        const sel = selectedPlan?.months === plan.months;
        return (
          <Pressable key={plan.months} onPress={() => onSelectPlan(sel ? null : plan)}
            style={[styles.card, sel && styles.cardSelected]}>
            <View style={styles.row}>
              <View style={[styles.radio, sel && styles.radioSel]}>
                {sel && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.months, sel && styles.monthsSel]}>{plan.months} Months</Text>
              <View style={[styles.rateBadge, sel && styles.rateBadgeSel]}>
                <Text style={[styles.rateText, sel && styles.rateTextSel]}>{plan.interestRate}% p.a.</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Monthly EMI</Text>
                <Text style={[styles.statVal, sel && { color: Colors.primary }]}>{APP_CONFIG.currency}{plan.monthlyAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Payable</Text>
                <Text style={styles.statValSm}>{APP_CONFIG.currency}{plan.totalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Processing Fee</Text>
                <Text style={styles.statValSm}>{APP_CONFIG.currency}{plan.processingFee.toLocaleString()}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.disclaimer}>*Interest calculated at reducing balance. T&C apply.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Fonts.sm, color: Colors.success, fontWeight: Fonts.medium, marginBottom: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  months: { flex: 1, fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  monthsSel: { color: Colors.primary },
  rateBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rateBadgeSel: { backgroundColor: Colors.primary },
  rateText: { fontSize: Fonts.xs, fontWeight: Fonts.medium, color: Colors.textSecondary },
  rateTextSel: { color: Colors.textInverse },
  stats: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, backgroundColor: Colors.border },
  statLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 3 },
  statVal: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  statValSm: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textSecondary },
  disclaimer: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: Spacing.sm, fontStyle: 'italic' },
});
