import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { useWizard } from '../WizardContext';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Dropdown } from '../../../../components/ui/Dropdown';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { Card } from '../../../../components/ui/Card';
import { createEmptyEmiPlan, CustomerVisibility, EMIPlan } from '../../types/product';
import { CUSTOMER_VISIBILITY, SERVICE_CHARGE_METHODS } from '../../data/constants';
import { computeEmiRowCalculations } from '../../utils/emiCalculations';
import { formatCurrency, getEffectiveSellingPrice } from '../../utils/productCalculations';
import { colors } from '../../../../theme/colors';
import { radius, shadow, spacing } from '../../../../theme/spacing';

const COLUMNS = [
  { key: 'enabled', label: 'Enable', width: 64 },
  { key: 'planName', label: 'Plan Name', width: 130 },
  { key: 'months', label: 'EMI Duration (Months)', width: 110 },
  { key: 'downPayment', label: 'Down Payment (₹)', width: 110 },
  { key: 'balance', label: 'Balance Amount', width: 110 },
  { key: 'serviceCharge', label: 'Service Charge (₹)', width: 115 },
  { key: 'deliveryCharge', label: 'Delivery Charge (₹)', width: 115 },
  { key: 'upfrontPayment', label: 'Upfront Payment', width: 120 },
  { key: 'totalPayable', label: 'Total Payable', width: 110 },
  { key: 'monthlyEmi', label: 'Monthly EMI', width: 100 },
  { key: 'minEligibility', label: 'Min Eligibility (₹)', width: 115 },
  { key: 'visibility', label: 'Customer Visibility', width: 110 },
  { key: 'actions', label: 'Actions', width: 100 },
] as const;

function visibilityLabel(v: CustomerVisibility): string {
  return v === 'visible' ? 'Visible' : 'Hidden';
}

function visibilityFromLabel(label: string): CustomerVisibility {
  const normalized = label.trim().toLowerCase();
  // Accept both current labels and legacy "Public" / "Members Only"
  if (
    normalized === 'visible' ||
    normalized === 'public' ||
    normalized === 'members only' ||
    normalized === 'members_only'
  ) {
    return 'visible';
  }
  return 'hidden';
}

export function Step9EMI() {
  const { formData, updateForm } = useWizard();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<EMIPlan | null>(null);

  const sellingPrice = getEffectiveSellingPrice(formData);
  const hasSellingPrice = sellingPrice > 0;

  const persistPlans = (plans: EMIPlan[]) => {
    updateForm({ emiPlans: plans });
  };

  const openAddModal = () => {
    setEditingPlan(createEmptyEmiPlan());
    setModalVisible(true);
  };

  const openEditModal = (plan: EMIPlan) => {
    setEditingPlan({ ...plan });
    setModalVisible(true);
  };

  const savePlan = () => {
    if (!editingPlan) return;
    const exists = formData.emiPlans.some((p) => p.id === editingPlan.id);
    const plans = exists
      ? formData.emiPlans.map((p) => (p.id === editingPlan.id ? editingPlan : p))
      : [...formData.emiPlans, editingPlan];
    persistPlans(plans);
    setModalVisible(false);
    setEditingPlan(null);
    console.log('EMI option saved');
  };

  const deletePlan = (id: string) => {
    persistPlans(formData.emiPlans.filter((p) => p.id !== id));
    console.log('EMI option deleted');
  };

  const togglePlanEnabled = (id: string, enabled: boolean) => {
    persistPlans(formData.emiPlans.map((p) => (p.id === id ? { ...p, enabled } : p)));
  };

  const modalCalcs = editingPlan ? computeEmiRowCalculations(sellingPrice, editingPlan) : null;

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.heading}>EMI Configuration</Text>
          <Text style={styles.subheading}>
            Enterprise EMI plan table — create any duration manually. Only admin-defined options appear on the customer product page.
          </Text>
        </View>
      </View>

      {!hasSellingPrice && (
        <View style={styles.priceWarning}>
          <Text style={styles.priceWarningTitle}>Selling price required for EMI calculations</Text>
          <Text style={styles.priceWarningText}>
            Go to Step 5 (Pricing) and enter the Selling Price. Balance, Total Payable, and Monthly EMI stay blank until a price is set.
          </Text>
        </View>
      )}

      <Card style={styles.configCard}>
        <Text style={styles.configTitle}>EMI Product Configuration</Text>
        <ToggleSwitch
          label="EMI Enable / Disable"
          description="Master switch to allow EMI purchase for this product"
          value={formData.emiEnabled}
          onValueChange={(v) => updateForm({ emiEnabled: v })}
        />
        <Input
          label="Default Down Payment Percentage (%)"
          placeholder="e.g. 20"
          value={formData.defaultDownPaymentPercent}
          onChangeText={(v) =>
            updateForm({ defaultDownPaymentPercent: v.replace(/[^0-9.]/g, '') })
          }
          keyboardType="numeric"
          hint="Product-wise default down payment used for EMI applications"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Min Customer Down Payment (₹)"
              value={formData.minCustomerDownPayment}
              onChangeText={(v) => updateForm({ minCustomerDownPayment: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Max Down Payment (₹)"
              value={formData.maxDownPayment}
              onChangeText={(v) => updateForm({ maxDownPayment: v })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Dropdown
          label="Service Charge Method"
          value={formData.serviceChargeMethod}
          options={SERVICE_CHARGE_METHODS}
          onSelect={(v) => updateForm({ serviceChargeMethod: v })}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Documentation Charge (₹)"
              value={formData.documentationCharge}
              onChangeText={(v) => updateForm({ documentationCharge: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Verification Charge (₹)"
              value={formData.verificationCharge}
              onChangeText={(v) => updateForm({ verificationCharge: v })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="First EMI Due After (days)"
              placeholder="e.g. 30"
              value={formData.firstEmiDueAfter}
              onChangeText={(v) => updateForm({ firstEmiDueAfter: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Grace Period (days)"
              placeholder="e.g. 7"
              value={formData.gracePeriod}
              onChangeText={(v) => updateForm({ gracePeriod: v })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <ToggleSwitch
          label="Down Payment Editable at Approval"
          description="Allow changing down payment during loan approval"
          value={formData.downPaymentEditableAtApproval}
          onValueChange={(v) => updateForm({ downPaymentEditableAtApproval: v })}
        />
      </Card>

      <Card padding={0} style={styles.tableCard}>
        <View style={styles.toolbar}>
          <View>
            <Text style={styles.toolbarTitle}>EMI Plan Table</Text>
            <Text style={styles.toolbarMeta}>{formData.emiPlans.length} option(s)</Text>
          </View>
          <Button title="+ Add EMI Option" onPress={openAddModal} size="sm" variant="accent" />
        </View>

        {formData.emiPlans.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No EMI options configured</Text>
            <Text style={styles.emptyHint}>
              Use "+ Add EMI Option" to create plans with any tenure — 3, 5, 11, 18, 27, 48 months or any custom value.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
            <View style={styles.table}>
              <View style={styles.headerRow}>
                {COLUMNS.map((col) => (
                  <Text key={col.key} style={[styles.headerCell, { width: col.width }]}>
                    {col.label}
                  </Text>
                ))}
              </View>

              {formData.emiPlans.map((plan, rowIndex) => {
                const calcs = computeEmiRowCalculations(sellingPrice, plan);
                const isEven = rowIndex % 2 === 0;

                return (
                  <View key={plan.id} style={[styles.dataRow, isEven && styles.dataRowAlt, !plan.enabled && styles.dataRowDisabled]}>
                    <View style={[styles.cell, { width: COLUMNS[0].width }]}>
                      <Switch
                        value={plan.enabled}
                        onValueChange={(v) => togglePlanEnabled(plan.id, v)}
                        trackColor={{ false: colors.border, true: colors.accentLight }}
                        thumbColor={plan.enabled ? colors.accent : colors.textMuted}
                      />
                    </View>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[1].width }]} numberOfLines={1}>
                      {plan.planName || '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[2].width }]}>
                      {plan.months || '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[3].width }]}>
                      {plan.downPayment ? formatCurrency(parseFloat(plan.downPayment)) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cellCalc, styles.cell, { width: COLUMNS[4].width }]}>
                      {hasSellingPrice ? formatCurrency(calcs.balanceAmount) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[5].width }]}>
                      {plan.serviceCharge ? formatCurrency(parseFloat(plan.serviceCharge)) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[6].width }]}>
                      {plan.deliveryCharge ? formatCurrency(parseFloat(plan.deliveryCharge)) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cellCalc, styles.cell, { width: COLUMNS[7].width }]}>
                      {hasSellingPrice ? formatCurrency(calcs.upfrontPayment) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cellCalc, styles.cell, { width: COLUMNS[8].width }]}>
                      {hasSellingPrice ? formatCurrency(calcs.totalPayable) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cellCalc, styles.cellEmi, styles.cell, { width: COLUMNS[9].width }]}>
                      {hasSellingPrice && plan.months ? formatCurrency(calcs.monthlyEmi) : '—'}
                    </Text>
                    <Text style={[styles.cellText, styles.cell, { width: COLUMNS[10].width }]}>
                      {plan.minEligibilityAmount ? formatCurrency(parseFloat(plan.minEligibilityAmount)) : '—'}
                    </Text>
                    <View style={[styles.cell, { width: COLUMNS[11].width }]}>
                      <View style={[styles.visibilityBadge, plan.customerVisibility === 'visible' ? styles.visibleBadge : styles.hiddenBadge]}>
                        <Text style={[styles.visibilityText, plan.customerVisibility === 'visible' ? styles.visibleText : styles.hiddenText]}>
                          {visibilityLabel(plan.customerVisibility)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.cell, styles.actionsCell, { width: COLUMNS[12].width }]}>
                      <TouchableOpacity onPress={() => openEditModal(plan)} style={styles.actionLink}>
                        <Text style={styles.actionEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deletePlan(plan.id)} style={styles.actionLink}>
                        <Text style={styles.actionDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {formData.emiPlans.length > 0 && (
          <View style={styles.tableFooter}>
            <Text style={styles.footerNote}>
              {hasSellingPrice
                ? `Calculated using selling price ${formatCurrency(sellingPrice)}.`
                : 'Set Selling Price in Step 5 (Pricing) to enable auto-calculated columns.'}
            </Text>
          </View>
        )}
      </Card>

      <EmiPlanModal
        visible={modalVisible}
        plan={editingPlan}
        calcs={modalCalcs}
        sellingPrice={sellingPrice}
        onChange={setEditingPlan}
        onSave={savePlan}
        onClose={() => {
          setModalVisible(false);
          setEditingPlan(null);
        }}
      />
    </View>
  );
}

function EmiPlanModal({
  visible,
  plan,
  calcs,
  sellingPrice,
  onChange,
  onSave,
  onClose,
}: {
  visible: boolean;
  plan: EMIPlan | null;
  calcs: ReturnType<typeof computeEmiRowCalculations> | null;
  sellingPrice: number;
  onChange: (plan: EMIPlan) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!plan) return null;
  const update = (data: Partial<EMIPlan>) => onChange({ ...plan, ...data });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, shadow.lg]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{plan.planName ? 'Edit EMI Option' : 'Add EMI Option'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input
              label="Plan Name"
              placeholder="e.g. Standard 18 Month"
              value={plan.planName}
              onChangeText={(v) => update({ planName: v })}
            />
            <Input
              label="EMI Duration (Months)"
              placeholder="Any value — 3, 5, 11, 18, 27, 48..."
              value={plan.months}
              onChangeText={(v) => update({ months: v.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Down Payment (₹)" value={plan.downPayment} onChangeText={(v) => update({ downPayment: v })} keyboardType="numeric" />
              </View>
              <View style={styles.half}>
                <Input label="Service Charge (₹)" value={plan.serviceCharge} onChangeText={(v) => update({ serviceCharge: v })} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Delivery Charge (₹)" value={plan.deliveryCharge} onChangeText={(v) => update({ deliveryCharge: v })} keyboardType="numeric" />
              </View>
              <View style={styles.half}>
                <Input label="Minimum Eligibility Amount (₹)" value={plan.minEligibilityAmount} onChangeText={(v) => update({ minEligibilityAmount: v })} keyboardType="numeric" />
              </View>
            </View>
            <Dropdown
              label="Customer Visibility"
              value={visibilityLabel(plan.customerVisibility)}
              options={CUSTOMER_VISIBILITY}
              onSelect={(v) => update({ customerVisibility: visibilityFromLabel(v) })}
            />
            <View style={styles.enableRow}>
              <Text style={styles.enableLabel}>Enable this EMI option</Text>
              <Switch
                value={plan.enabled}
                onValueChange={(v) => update({ enabled: v })}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={plan.enabled ? colors.accent : colors.textMuted}
              />
            </View>

            {calcs && sellingPrice > 0 ? (
              <View style={styles.calcPreview}>
                <Text style={styles.calcPreviewTitle}>Auto Calculated Preview</Text>
                <CalcPreviewRow label="Loan Amount" value={formatCurrency(calcs.loanAmount)} />
                <CalcPreviewRow
                  label="Monthly EMI"
                  value={plan.months ? formatCurrency(calcs.monthlyEmi) : '— (enter EMI duration)'}
                  highlight
                />
                <CalcPreviewRow label="Upfront Payment" value={formatCurrency(calcs.upfrontPayment)} />
                <CalcPreviewRow label="Total Payable" value={formatCurrency(calcs.totalPayable)} />
              </View>
            ) : (
              <View style={styles.calcPreviewMissing}>
                <Text style={styles.calcPreviewMissingText}>
                  Set Selling Price in Step 5 (Pricing) to preview Loan Amount, EMI, Upfront Payment, and Total Payable.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button title="Cancel" onPress={onClose} variant="outline" style={{ flex: 1 }} />
            <Button title="Save Option" onPress={onSave} variant="accent" style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CalcPreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.calcPreviewRow}>
      <Text style={styles.calcPreviewLabel}>{label}</Text>
      <Text style={[styles.calcPreviewValue, highlight && styles.calcPreviewHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  pageHeader: { marginBottom: spacing.lg },
  priceWarning: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  priceWarningTitle: { fontSize: 14, fontWeight: '700', color: colors.warning, marginBottom: spacing.xs },
  priceWarningText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  configCard: { marginBottom: spacing.lg },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  tableCard: { overflow: 'hidden', borderColor: colors.border },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarTitle: { fontSize: 15, fontWeight: '700', color: colors.textHeading },
  toolbarMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { padding: spacing.xxxl, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, maxWidth: 400 },
  table: { minWidth: 1289 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  dataRowAlt: { backgroundColor: colors.background },
  dataRowDisabled: { opacity: 0.55 },
  cell: { paddingHorizontal: spacing.xs, justifyContent: 'center' },
  cellText: { fontSize: 13, color: colors.text },
  cellCalc: { color: colors.textSecondary, fontWeight: '500' },
  cellEmi: { color: colors.accentDark, fontWeight: '700' },
  visibilityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  visibleBadge: { backgroundColor: colors.successLight },
  hiddenBadge: { backgroundColor: colors.borderLight },
  visibilityText: { fontSize: 11, fontWeight: '700' },
  visibleText: { color: colors.success },
  hiddenText: { color: colors.textMuted },
  actionsCell: { flexDirection: 'row', gap: spacing.sm },
  actionLink: { paddingVertical: spacing.xs },
  actionEdit: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  actionDelete: { fontSize: 12, fontWeight: '600', color: colors.danger },
  tableFooter: {
    padding: spacing.md,
    backgroundColor: colors.borderLight,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerNote: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xxl,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  modalClose: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: colors.textSecondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  enableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.sm },
  enableLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  calcPreview: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  calcPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentDark,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  calcPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  calcPreviewLabel: { fontSize: 13, color: colors.textSecondary },
  calcPreviewValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  calcPreviewHighlight: { color: colors.accentDark },
  calcPreviewMissing: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
  },
  calcPreviewMissingText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
