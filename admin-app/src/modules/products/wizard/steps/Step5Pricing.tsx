import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWizard } from '../WizardContext';
import { Input } from '../../../../components/ui/Input';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { Card } from '../../../../components/ui/Card';
import {
  computePricing,
  computeMarketLowestPrice,
  computeValidationAlerts,
  formatCurrency,
  formatPercent,
} from '../../utils/productCalculations';
import { ValidationAlerts } from '../../components/ValidationAlerts';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step5Pricing() {
  const { formData, updateForm } = useWizard();

  useEffect(() => {
    const calc = computePricing(formData);
    const marketLowest = computeMarketLowestPrice(formData);
    updateForm({
      gstAmount: calc.gstAmount > 0 ? calc.gstAmount.toFixed(2) : '',
      landingCost: calc.landingCost > 0 ? calc.landingCost.toFixed(2) : '',
      margin: calc.sellingPrice > 0 ? formatPercent(calc.margin) : '',
      discount: calc.mrp > 0 ? formatPercent(calc.discount) : '',
      marketLowestPrice: marketLowest > 0 ? String(marketLowest) : formData.marketLowestPrice,
    });
  }, [formData.mrp, formData.purchasePrice, formData.sellingPrice, formData.gst, formData.amazonPrice, formData.flipkartPrice, formData.otherWebsitePrice]);

  const calc = computePricing(formData);
  const alerts = computeValidationAlerts(formData, calc).filter(
    (a) => a.id === 'mrp-low' || a.id === 'above-market'
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Pricing</Text>
      <Text style={styles.subheading}>Set MRP, selling price, and margin calculations</Text>

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="MRP"
            placeholder="Maximum retail price"
            value={formData.mrp}
            onChangeText={(v) => updateForm({ mrp: v })}
            keyboardType="numeric"
            required
          />
        </View>
        <View style={styles.half}>
          <Input
            label="Selling Price"
            placeholder="Customer price"
            value={formData.sellingPrice}
            onChangeText={(v) => updateForm({ sellingPrice: v })}
            keyboardType="numeric"
            required
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="Purchase Price"
            placeholder="Cost from supplier"
            value={formData.purchasePrice}
            onChangeText={(v) => updateForm({ purchasePrice: v })}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <Input
            label="GST (%)"
            placeholder="Enter any percentage e.g. 5, 12, 18, 28"
            value={formData.gst}
            onChangeText={(v) => updateForm({ gst: v.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            hint="Enter any custom GST percentage"
            required
          />
        </View>
      </View>

      <Card style={styles.summary}>
        <Text style={styles.summaryTitle}>Calculated Values</Text>
        <SummaryRow label="Discount" value={formData.discount || '—'} />
        <SummaryRow label="GST Amount" value={formData.gstAmount ? formatCurrency(parseFloat(formData.gstAmount)) : '—'} />
        <SummaryRow label="Landing Cost" value={formData.landingCost ? formatCurrency(parseFloat(formData.landingCost)) : '—'} />
        <SummaryRow label="Margin" value={formData.margin || '—'} highlight />
      </Card>

      {alerts.length > 0 && (
        <View style={styles.alertWrap}>
          <ValidationAlerts alerts={alerts} />
        </View>
      )}

      <Text style={styles.sectionHeading}>Marketplace Price Comparison</Text>
      <Text style={styles.sectionSub}>Compare listing price against major marketplaces</Text>

      <Card>
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Amazon Price"
              placeholder="₹"
              value={formData.amazonPrice}
              onChangeText={(v) => updateForm({ amazonPrice: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Flipkart Price"
              placeholder="₹"
              value={formData.flipkartPrice}
              onChangeText={(v) => updateForm({ flipkartPrice: v })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Other Website Price"
              placeholder="₹"
              value={formData.otherWebsitePrice}
              onChangeText={(v) => updateForm({ otherWebsitePrice: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Market Lowest Price"
              placeholder="Auto from marketplace prices"
              value={formData.marketLowestPrice}
              onChangeText={(v) => updateForm({ marketLowestPrice: v })}
              keyboardType="numeric"
              hint={
                computeMarketLowestPrice(formData) > 0
                  ? `Auto: ${formatCurrency(computeMarketLowestPrice(formData))} (min of entered prices)`
                  : 'Auto-calculated as min of Amazon / Flipkart / Other'
              }
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Price Checked Date"
              placeholder="DD/MM/YYYY"
              value={formData.priceCheckedDate}
              onChangeText={(v) => updateForm({ priceCheckedDate: v })}
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Price Checked By"
              placeholder="Team member name"
              value={formData.priceCheckedBy}
              onChangeText={(v) => updateForm({ priceCheckedBy: v })}
            />
          </View>
        </View>

        <Input
          label="Maximum Discount Allowed (%)"
          placeholder="e.g. 10"
          value={formData.maximumDiscountAllowed}
          onChangeText={(v) => updateForm({ maximumDiscountAllowed: v })}
          keyboardType="numeric"
        />

        <ToggleSwitch
          label="Price Match Allowed"
          description="Allow matching competitor marketplace prices"
          value={formData.priceMatchAllowed}
          onValueChange={(v) => updateForm({ priceMatchAllowed: v })}
        />
      </Card>
    </View>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textHeading,
    marginTop: spacing.xxl,
  },
  sectionSub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  summary: { marginTop: spacing.lg, backgroundColor: colors.accentLight, borderColor: colors.accent },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.accentDark, marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 46, 111, 0.12)',
  },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  highlight: { color: colors.accentDark },
  alertWrap: { marginTop: spacing.lg },
});
