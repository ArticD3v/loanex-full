import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWizard } from '../WizardContext';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { VariantExpandableCard } from '../../components/VariantExpandableCard';
import { createEmptyVariant, ProductVariant } from '../../types/product';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step3Variants() {
  const { formData, updateForm } = useWizard();
  const [newVariantName, setNewVariantName] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const addVariant = () => {
    const name = newVariantName.trim();
    if (!name) return;
    
    // Check if a variant with this name already exists
    if (formData.variants.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      setNewVariantName('');
      return;
    }

    const index = formData.variants.length;
    const newVariant = createEmptyVariant(name, index, formData.sku, {
      mrp: formData.mrp,
      sellingPrice: formData.sellingPrice,
      purchasePrice: formData.purchasePrice,
    });

    updateForm({
      variants: [...formData.variants, newVariant],
    });
    setNewVariantName('');
    setExpandedIds([newVariant.id]); // auto-expand the newly added variant
  };

  const removeVariant = (id: string) => {
    updateForm({
      variants: formData.variants.filter((v) => v.id !== id),
    });
  };

  const updateVariant = (id: string, data: Partial<ProductVariant>) => {
    updateForm({
      variants: formData.variants.map((v) => (v.id === id ? { ...v, ...data, saved: false } : v)),
    });
  };

  const saveVariant = (id: string) => {
    updateForm({
      variants: formData.variants.map((v) => (v.id === id ? { ...v, saved: true } : v)),
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!formData.variantsEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Variants</Text>
        <Text style={styles.subheading}>Configure product variants or sell as a single SKU</Text>
        <Card>
          <ToggleSwitch
            label="Enable Variants"
            description="Turn on to create multiple SKUs with different attributes"
            value={formData.variantsEnabled}
            onValueChange={(v) => updateForm({ variantsEnabled: v })}
          />
          <View style={styles.normalProduct}>
            <Text style={styles.normalIcon}>📦</Text>
            <Text style={styles.normalTitle}>Normal Product</Text>
            <Text style={styles.normalDesc}>This product will be sold as a single SKU without variants.</Text>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Variants</Text>
      <Text style={styles.subheading}>Easily add options like Size, Color, or Storage capacity</Text>

      <Card style={styles.card}>
        <ToggleSwitch
          label="Enable Variants"
          value={formData.variantsEnabled}
          onValueChange={(v) => updateForm({ variantsEnabled: v, variants: [], attributes: [] })}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Add Variant</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md }}>
          Type a variant name (e.g., "Red", "64GB", "Large") and add it to the list.
        </Text>
        
        <View style={styles.addValueRow}>
          <Input
            placeholder="e.g. Red - 64GB"
            value={newVariantName}
            onChangeText={setNewVariantName}
            style={{ flex: 1, marginBottom: 0 }}
            onSubmitEditing={addVariant}
          />
          <Button title="Add Variant" onPress={addVariant} size="md" />
        </View>
      </Card>

      {formData.variants.length > 0 && (
        <View>
          <View style={styles.variantHeader}>
            <Text style={styles.sectionTitle}>{formData.variants.length} Variants Added</Text>
            <TouchableOpacity onPress={() => updateForm({ variants: [] })}>
              <Text style={styles.removeAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {formData.variants.map((variant) => (
            <View key={variant.id} style={{ position: 'relative', marginBottom: spacing.sm }}>
              <VariantExpandableCard
                variant={variant}
                expanded={expandedIds.includes(variant.id)}
                onToggle={() => toggleExpanded(variant.id)}
                onUpdate={(data) => updateVariant(variant.id, data)}
                onSave={() => saveVariant(variant.id)}
                emiPlans={formData.emiPlans}
              />
              <TouchableOpacity 
                style={styles.deleteVariantBtn} 
                onPress={() => removeVariant(variant.id)}
              >
                <Text style={styles.deleteVariantText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  card: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  normalProduct: { alignItems: 'center', paddingVertical: spacing.xxxl },
  normalIcon: { fontSize: 48, marginBottom: spacing.md },
  normalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  normalDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  attrBlock: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.lg, marginTop: spacing.lg },
  attrHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  attrName: { fontSize: 15, fontWeight: '700', color: colors.text },
  removeAttr: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  addValueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  removeAllText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  deleteVariantBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.dangerLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteVariantText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
