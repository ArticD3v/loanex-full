import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWizard } from '../WizardContext';
import { useOptionsRegistry } from '../OptionsRegistryContext';
import { Input } from '../../../../components/ui/Input';
import { Dropdown } from '../../../../components/ui/Dropdown';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ManageableDropdown } from '../../components/ManageableDropdown';
import {
  PAYMENT_TERMS,
  SETTLEMENT_CYCLES,
  PRODUCT_SOURCES,
  STOCK_OWNERSHIP_TYPES,
} from '../../data/constants';
import { createEmptySupplier, SupplierEntry } from '../../types/product';
import { formatDealerPaymentSchedule } from '../../utils/productCalculations';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step7Supplier() {
  const { formData, updateForm } = useWizard();
  const options = useOptionsRegistry();

  const addSupplier = () => {
    updateForm({ suppliers: [...formData.suppliers, createEmptySupplier()] });
  };

  const updateSupplier = (id: string, data: Partial<SupplierEntry>) => {
    updateForm({
      suppliers: formData.suppliers.map((s) => (s.id === id ? { ...s, ...data } : s)),
    });
  };

  const removeSupplier = (id: string) => {
    updateForm({ suppliers: formData.suppliers.filter((s) => s.id !== id) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Supplier</Text>
      <Text style={styles.subheading}>Link suppliers, dealers, settlement cycles, and purchase details</Text>

      {formData.suppliers.length === 0 && (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No suppliers added yet</Text>
          <Button title="+ Add Supplier" onPress={addSupplier} />
        </Card>
      )}

      {formData.suppliers.map((supplier, index) => (
        <Card key={supplier.id} style={styles.supplierCard}>
          <View style={styles.supplierHeader}>
            <Text style={styles.supplierTitle}>Supplier #{index + 1}</Text>
            <TouchableOpacity onPress={() => removeSupplier(supplier.id)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>

          <ManageableDropdown
            label="Supplier"
            entityName="Supplier"
            value={supplier.supplier}
            options={options.suppliers}
            onSelect={(v) => {
              const master = options.findSupplierByName(v);
              updateSupplier(supplier.id, {
                supplier: v,
                ...(master?.paymentTerms ? { paymentTerms: master.paymentTerms } : {}),
                ...(master?.settlementCycle
                  ? { settlementCycle: master.settlementCycle }
                  : {}),
                ...(master?.gstin ? { supplierGstin: master.gstin } : {}),
                ...(master?.phone ? { supplierContact: master.phone } : {}),
              });
            }}
            onAdd={(name) => options.addSupplier(name)}
            onRename={(from, to) => {
              const ok = options.renameSupplier(from, to);
              if (ok) {
                updateForm({
                  suppliers: formData.suppliers.map((s) =>
                    s.supplier === from ? { ...s, supplier: to } : s
                  ),
                });
              }
              return ok;
            }}
            onDelete={(name) => {
              options.deleteSupplier(name);
              updateForm({
                suppliers: formData.suppliers.map((s) =>
                  s.supplier === name ? { ...s, supplier: '' } : s
                ),
              });
            }}
          />

          <ManageableDropdown
            label="Dealer"
            entityName="Dealer"
            value={supplier.dealer}
            options={options.dealers}
            onSelect={(v) => {
              const master = options.findDealerByName(v);
              updateSupplier(supplier.id, {
                dealer: v,
                ...(master?.dealerBranch ? { dealerBranch: master.dealerBranch } : {}),
                ...(master?.paymentSettlementTerms
                  ? { paymentTerms: master.paymentSettlementTerms }
                  : {}),
              });
            }}
            onAdd={(name) => options.addDealer(name)}
            onRename={(from, to) => {
              const ok = options.renameDealer(from, to);
              if (ok) {
                updateForm({
                  suppliers: formData.suppliers.map((s) =>
                    s.dealer === from ? { ...s, dealer: to } : s
                  ),
                });
              }
              return ok;
            }}
            onDelete={(name) => {
              options.deleteDealer(name);
              updateForm({
                suppliers: formData.suppliers.map((s) =>
                  s.dealer === name ? { ...s, dealer: '' } : s
                ),
              });
            }}
          />

          <ManageableDropdown
            label="Wholesaler"
            entityName="Wholesaler"
            value={supplier.wholesaler}
            options={options.wholesalers}
            onSelect={(v) => updateSupplier(supplier.id, { wholesaler: v })}
            onAdd={(name) => options.addWholesaler(name)}
            onRename={(from, to) => {
              const ok = options.renameWholesaler(from, to);
              if (ok) {
                updateForm({
                  suppliers: formData.suppliers.map((s) =>
                    s.wholesaler === from ? { ...s, wholesaler: to } : s
                  ),
                });
              }
              return ok;
            }}
            onDelete={(name) => {
              options.deleteWholesaler(name);
              updateForm({
                suppliers: formData.suppliers.map((s) =>
                  s.wholesaler === name ? { ...s, wholesaler: '' } : s
                ),
              });
            }}
          />

          <Dropdown
            label="Product Source"
            value={supplier.productSource}
            options={PRODUCT_SOURCES}
            onSelect={(v) => updateSupplier(supplier.id, { productSource: v })}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Supplier Code" value={supplier.supplierCode} onChangeText={(v) => updateSupplier(supplier.id, { supplierCode: v })} />
            </View>
            <View style={styles.half}>
              <Input label="Dealer Branch" value={supplier.dealerBranch} onChangeText={(v) => updateSupplier(supplier.id, { dealerBranch: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Supplier GSTIN" value={supplier.supplierGstin} onChangeText={(v) => updateSupplier(supplier.id, { supplierGstin: v })} />
            </View>
            <View style={styles.half}>
              <Input label="Supplier Contact" value={supplier.supplierContact} onChangeText={(v) => updateSupplier(supplier.id, { supplierContact: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Supplier SKU" value={supplier.supplierSku} onChangeText={(v) => updateSupplier(supplier.id, { supplierSku: v })} />
            </View>
            <View style={styles.half}>
              <Input label="Supplier Product Code" value={supplier.supplierProductCode} onChangeText={(v) => updateSupplier(supplier.id, { supplierProductCode: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Dropdown
                label="Stock Ownership"
                value={supplier.stockOwnership}
                options={STOCK_OWNERSHIP_TYPES}
                onSelect={(v) => updateSupplier(supplier.id, { stockOwnership: v })}
              />
            </View>
            <View style={styles.half}>
              <Input label="Dispatch From" value={supplier.dispatchFrom} onChangeText={(v) => updateSupplier(supplier.id, { dispatchFrom: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Purchase Invoice" value={supplier.purchaseInvoice} onChangeText={(v) => updateSupplier(supplier.id, { purchaseInvoice: v })} />
            </View>
            <View style={styles.half}>
              <Input label="Purchase Date" placeholder="DD/MM/YYYY" value={supplier.purchaseDate} onChangeText={(v) => updateSupplier(supplier.id, { purchaseDate: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Dropdown label="Settlement Cycle" value={supplier.settlementCycle} options={SETTLEMENT_CYCLES} onSelect={(v) => updateSupplier(supplier.id, { settlementCycle: v })} />
            </View>
            <View style={styles.half}>
              <Dropdown label="Payment Terms" value={supplier.paymentTerms} options={PAYMENT_TERMS} onSelect={(v) => updateSupplier(supplier.id, { paymentTerms: v })} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Lead Time (days)" placeholder="e.g. 7" value={supplier.leadTime} onChangeText={(v) => updateSupplier(supplier.id, { leadTime: v })} keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Input label="Dealer Incentive %" value={supplier.dealerIncentivePercent} onChangeText={(v) => updateSupplier(supplier.id, { dealerIncentivePercent: v })} keyboardType="numeric" />
            </View>
          </View>

          <Text style={styles.paymentLabel}>Dealer Payment Split</Text>
          <View style={styles.row}>
            <View style={styles.third}>
              <Input label="First Payment %" value={supplier.firstPaymentPercent} onChangeText={(v) => updateSupplier(supplier.id, { firstPaymentPercent: v })} keyboardType="numeric" />
            </View>
            <View style={styles.third}>
              <Input label="Delivery Payment %" value={supplier.deliveryPaymentPercent} onChangeText={(v) => updateSupplier(supplier.id, { deliveryPaymentPercent: v })} keyboardType="numeric" />
            </View>
            <View style={styles.third}>
              <Input label="Hold Payment %" value={supplier.holdPaymentPercent} onChangeText={(v) => updateSupplier(supplier.id, { holdPaymentPercent: v })} keyboardType="numeric" />
            </View>
          </View>

          <Card style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>Dealer Payment Schedule Summary</Text>
            <Text style={styles.scheduleText}>{formatDealerPaymentSchedule(supplier)}</Text>
          </Card>

          <ToggleSwitch
            label="Return to Supplier Allowed"
            description="Allow returning unsold stock to this supplier"
            value={supplier.returnToSupplierAllowed}
            onValueChange={(v) => updateSupplier(supplier.id, { returnToSupplierAllowed: v })}
          />

          <Input label="Supplier Notes" value={supplier.notes} onChangeText={(v) => updateSupplier(supplier.id, { notes: v })} multiline />
        </Card>
      ))}

      {formData.suppliers.length > 0 && (
        <Button title="+ Add Another Supplier" onPress={addSupplier} variant="outline" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, marginBottom: spacing.lg },
  emptyText: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  supplierCard: { marginBottom: spacing.lg },
  supplierHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  supplierTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  remove: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  third: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  scheduleCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  scheduleTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  scheduleText: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
});
