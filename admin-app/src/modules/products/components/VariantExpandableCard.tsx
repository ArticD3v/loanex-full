import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProductVariant, EMIPlan } from '../types/product';
import { formatEmiOptionLabel } from '../utils/productCalculations';
import { ExpandableCard } from '../../../components/ui/ExpandableCard';
import { Input } from '../../../components/ui/Input';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import { ImagePlaceholder } from '../../../components/ui/ImagePlaceholder';
import { DynamicKeyValueList } from '../../../components/ui/DynamicKeyValueList';
import { DynamicTextList } from '../../../components/ui/DynamicTextList';
import { ManageableDropdown } from './ManageableDropdown';
import { useOptionsRegistry } from '../wizard/OptionsRegistryContext';
import { useWizard } from '../wizard/WizardContext';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

interface VariantExpandableCardProps {
  variant: ProductVariant;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<ProductVariant>) => void;
  onSave: () => void;
  emiPlans: EMIPlan[];
}

export function VariantExpandableCard({
  variant,
  expanded,
  onToggle,
  onUpdate,
  onSave,
  emiPlans,
}: VariantExpandableCardProps) {
  const options = useOptionsRegistry();
  const { formData, updateForm } = useWizard();
  const emiPlanMap = emiPlans.filter((p) => p.enabled && p.customerVisibility === 'visible' && p.months);
  const emiOptions = emiPlanMap.map((p, i) => formatEmiOptionLabel(p, i));

  const addGalleryImage = () => {
    const url = `https://picsum.photos/seed/${variant.id}-${Date.now()}/200`;
    onUpdate({ galleryImages: [...variant.galleryImages, url] });
    console.log('Variant gallery image added');
  };

  return (
    <ExpandableCard
      title={variant.name}
      subtitle={`SKU: ${variant.sku || '—'} · Stock: ${variant.stock || '0'}`}
      expanded={expanded}
      onToggle={onToggle}
      badge={variant.saved ? 'Saved' : 'Draft'}
      badgeColor={variant.saved ? colors.success : undefined}
    >
      <Text style={styles.sectionLabel}>Images</Text>
      <View style={styles.imageRow}>
        <View>
          <Text style={styles.imageLabel}>Variant Image</Text>
          <ImagePlaceholder
            size="md"
            imageUri={variant.variantImage}
            onPress={() => {
              onUpdate({ variantImage: `https://picsum.photos/seed/${variant.id}/200` });
              console.log('Variant image uploaded');
            }}
          />
        </View>
        <View style={styles.galleryWrap}>
          <Text style={styles.imageLabel}>Gallery Images</Text>
          <View style={styles.galleryRow}>
            {variant.galleryImages.map((uri, i) => (
              <ImagePlaceholder key={i} size="sm" imageUri={uri} />
            ))}
            <ImagePlaceholder size="sm" label="Add" onPress={addGalleryImage} />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Input label="SKU" value={variant.sku} onChangeText={(v) => onUpdate({ sku: v })} />
        </View>
        <View style={styles.half}>
          <Input label="Barcode" value={variant.barcode} onChangeText={(v) => onUpdate({ barcode: v })} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.third}>
          <Input label="MRP" value={variant.mrp} onChangeText={(v) => onUpdate({ mrp: v })} keyboardType="numeric" />
        </View>
        <View style={styles.third}>
          <Input label="Selling Price" value={variant.sellingPrice} onChangeText={(v) => onUpdate({ sellingPrice: v })} keyboardType="numeric" />
        </View>
        <View style={styles.third}>
          <Input label="Purchase Price" value={variant.purchasePrice} onChangeText={(v) => onUpdate({ purchasePrice: v })} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Input label="Stock" value={variant.stock} onChangeText={(v) => onUpdate({ stock: v })} keyboardType="numeric" />
        </View>
        <View style={styles.half}>
          <Dropdown
            label="Status"
            value={variant.status}
            options={['active', 'draft', 'out_of_stock']}
            onSelect={(v) => onUpdate({ status: v as ProductVariant['status'] })}
          />
        </View>
      </View>

      <Input label="Description" value={variant.description} onChangeText={(v) => onUpdate({ description: v })} multiline />

      <DynamicKeyValueList
        title="Specifications"
        items={variant.specifications}
        onChange={(specifications) => onUpdate({ specifications })}
      />

      <DynamicTextList
        title="Features"
        addLabel="+ Add Feature"
        placeholder="Enter feature"
        items={variant.features}
        onChange={(features) => onUpdate({ features })}
      />

      <DynamicTextList
        title="Box Contents"
        addLabel="+ Add Item"
        placeholder="Enter box item"
        items={variant.boxContents}
        onChange={(boxContents) => onUpdate({ boxContents })}
      />

      <Text style={styles.sectionLabel}>Dimensions</Text>
      <View style={styles.row}>
        <View style={styles.quarter}>
          <Input label="Weight (kg)" value={variant.weight} onChangeText={(v) => onUpdate({ weight: v })} keyboardType="numeric" />
        </View>
        <View style={styles.quarter}>
          <Input label="Length" value={variant.length} onChangeText={(v) => onUpdate({ length: v })} keyboardType="numeric" />
        </View>
        <View style={styles.quarter}>
          <Input label="Width" value={variant.width} onChangeText={(v) => onUpdate({ width: v })} keyboardType="numeric" />
        </View>
        <View style={styles.quarter}>
          <Input label="Height" value={variant.height} onChangeText={(v) => onUpdate({ height: v })} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <ManageableDropdown
            label="Supplier"
            entityName="Supplier"
            value={variant.supplier}
            options={options.suppliers}
            onSelect={(v) => onUpdate({ supplier: v })}
            onAdd={(name) => options.addSupplier(name)}
            onRename={(from, to) => {
              const ok = options.renameSupplier(from, to);
              if (ok) {
                updateForm({
                  suppliers: formData.suppliers.map((s) =>
                    s.supplier === from ? { ...s, supplier: to } : s
                  ),
                  variants: formData.variants.map((v) =>
                    v.supplier === from ? { ...v, supplier: to, saved: false } : v
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
                variants: formData.variants.map((v) =>
                  v.supplier === name ? { ...v, supplier: '', saved: false } : v
                ),
              });
            }}
          />
        </View>
        <View style={styles.half}>
          <ManageableDropdown
            label="Warehouse"
            entityName="Warehouse"
            value={variant.warehouse}
            options={options.warehouses}
            onSelect={(v) => onUpdate({ warehouse: v })}
            onAdd={(name) => options.addWarehouse(name)}
            onRename={(from, to) => {
              const ok = options.renameWarehouse(from, to);
              if (ok) {
                updateForm({
                  warehouse: formData.warehouse === from ? to : formData.warehouse,
                  variants: formData.variants.map((v) =>
                    v.warehouse === from ? { ...v, warehouse: to, saved: false } : v
                  ),
                });
              }
              return ok;
            }}
            onDelete={(name) => {
              options.deleteWarehouse(name);
              updateForm({
                warehouse: formData.warehouse === name ? '' : formData.warehouse,
                variants: formData.variants.map((v) =>
                  v.warehouse === name ? { ...v, warehouse: '', saved: false } : v
                ),
              });
            }}
          />
        </View>
      </View>

      <Dropdown
        label="EMI Plan Mapping"
        placeholder="Select EMI plan"
        value={
          emiPlanMap.find((p) => p.id === variant.emiPlanId)
            ? formatEmiOptionLabel(
                emiPlanMap.find((p) => p.id === variant.emiPlanId)!,
                emiPlanMap.findIndex((p) => p.id === variant.emiPlanId)
              )
            : ''
        }
        options={emiOptions.length ? emiOptions : ['No EMI options available']}
        onSelect={(v) => {
          const plan = emiPlanMap.find((p, i) => formatEmiOptionLabel(p, i) === v);
          if (plan) onUpdate({ emiPlanId: plan.id });
        }}
      />

      <Button title="Save Variant" onPress={onSave} style={{ marginTop: spacing.md }} />
    </ExpandableCard>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.md },
  imageLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  galleryWrap: { flex: 1, minWidth: 200 },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  third: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  quarter: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, maxWidth: '100%' },
});
