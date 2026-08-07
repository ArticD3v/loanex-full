import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useWizard } from '../WizardContext';
import { Card } from '../../../../components/ui/Card';
import { ImagePlaceholder } from '../../../../components/ui/ImagePlaceholder';
import { LiveCalculationPanel } from '../../components/LiveCalculationPanel';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';
import { formatCurrency, formatDealerPaymentSchedule } from '../../utils/productCalculations';

export function Step11Review() {
  const { formData } = useWizard();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Review & Publish</Text>
      <Text style={styles.subheading}>Review all product information before publishing</Text>

      <LiveCalculationPanel formData={formData} />

      <ReviewCard title="Basic Information">
        <ReviewRow label="Product Name" value={formData.productName} />
        <ReviewRow label="SKU" value={formData.sku} />
        <ReviewRow
          label="Colour / Size / Variant"
          value={formatReviewValue(formData.colourSizeVariant)}
        />
        <ReviewRow
          label="Product Video URL"
          value={formatReviewValue(formData.productVideoUrl)}
        />
        <ReviewRow label="Serial/IMEI Tracking" value={formData.serialImeiTracking ? 'Yes' : 'No'} />
        <ReviewRow label="Specifications" value={`${(formData.specifications ?? []).length} items`} />
        <ReviewRow label="Features" value={`${(formData.features ?? []).length} items`} />
        <ReviewRow label="Box Contents" value={`${(formData.boxContents ?? []).length} items`} />
      </ReviewCard>

      <ReviewCard title="Category">
        <ReviewRow
          label="Path"
          value={[formData.category, formData.subCategory, formData.brand].filter(Boolean).join(' › ') || '—'}
        />
        <ReviewRow label="Brand" value={formData.brand || '—'} />
      </ReviewCard>

      <ReviewCard title="Variants">
        {formData.variantsEnabled ? (
          <>
            <ReviewRow label="Mode" value={`${formData.variants.length} variants`} />
            {formData.variants.slice(0, 3).map((v) => (
              <ReviewRow key={v.id} label={v.name} value={`₹${v.sellingPrice || '—'} · ${v.saved ? 'Saved' : 'Draft'}`} />
            ))}
          </>
        ) : (
          <ReviewRow label="Mode" value="Normal Product (Single SKU)" />
        )}
      </ReviewCard>

      <ReviewCard title="Pricing">
        <ReviewRow label="MRP" value={formData.mrp ? formatCurrency(parseFloat(formData.mrp)) : '—'} />
        <ReviewRow label="Selling Price" value={formData.sellingPrice ? formatCurrency(parseFloat(formData.sellingPrice)) : '—'} highlight />
        <ReviewRow label="GST" value={formData.gst ? `${formData.gst}%` : '—'} />
        <ReviewRow label="GST Amount" value={formData.gstAmount ? formatCurrency(parseFloat(formData.gstAmount)) : '—'} />
        <ReviewRow label="Margin" value={formData.margin || '—'} />
        <ReviewRow label="Market Lowest Price" value={formData.marketLowestPrice ? formatCurrency(parseFloat(formData.marketLowestPrice)) : '—'} />
        <ReviewRow label="Price Match Allowed" value={formData.priceMatchAllowed ? 'Yes' : 'No'} />
      </ReviewCard>

      <ReviewCard title="Inventory & Purchase Rules">
        <ReviewRow label="Warehouse" value={formData.warehouse || '—'} />
        <ReviewRow label="Available Stock" value={formData.availableStock || '—'} />
        <ReviewRow label="Min Order Qty" value={formData.minOrderQuantity || '—'} />
        <ReviewRow label="Max Qty / Customer" value={formData.maxQuantityPerCustomer || '—'} />
        <ReviewRow label="Cash Purchase" value={formData.cashPurchase ? 'Yes' : 'No'} />
        <ReviewRow label="Invoice Setting" value={formData.invoiceSetting || '—'} />
        <ReviewRow label="Field Verification" value={formData.requiresFieldVerification ? 'Required' : 'No'} />
      </ReviewCard>

      <ReviewCard title="Supplier">
        {formData.suppliers.length === 0 ? (
          <ReviewRow label="Suppliers" value="None added" />
        ) : (
          formData.suppliers.map((s, i) => (
            <React.Fragment key={s.id}>
              <ReviewRow label={`Supplier ${i + 1}`} value={`${s.supplier || '—'} · ${s.settlementCycle || '—'}`} />
              <ReviewRow label={`Payment Schedule ${i + 1}`} value={formatDealerPaymentSchedule(s)} />
            </React.Fragment>
          ))
        )}
      </ReviewCard>

      <ReviewCard title="Delivery">
        <ReviewRow label="Dispatch SLA" value={formData.dispatchSla || '—'} />
        <ReviewRow label="Delivery Partner" value={formData.deliveryPartner || '—'} />
        <ReviewRow label="Delivery Zone" value={formData.deliveryZone || '—'} />
        <ReviewRow label="Delivery Charges" value={formData.deliveryCharges ? formatCurrency(parseFloat(formData.deliveryCharges)) : '—'} />
        <ReviewRow label="Delivery Days" value={formData.deliveryDays || '—'} />
        <ReviewRow label="Express Delivery" value={formData.expressDelivery ? 'Yes' : 'No'} />
        <ReviewRow label="OTP Confirmation" value={formData.deliveryConfirmationOtp ? 'Yes' : 'No'} />
      </ReviewCard>

      <ReviewCard title="Images">
        <View style={styles.imageRow}>
          {formData.primaryImage ? (
            <Image
              source={{ uri: formData.primaryImage }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <ImagePlaceholder size="sm" />
          )}
          {(formData.galleryImages ?? []).slice(0, 3).map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.thumb} resizeMode="cover" />
          ))}
        </View>
      </ReviewCard>

      <ReviewCard title="EMI">
        <ReviewRow label="EMI Enabled" value={formData.emiEnabled ? 'Yes' : 'No'} />
        <ReviewRow
          label="Default Down Payment %"
          value={formData.defaultDownPaymentPercent ? `${formData.defaultDownPaymentPercent}%` : '—'}
        />
        <ReviewRow label="EMI Options" value={`${formData.emiPlans.length} plan(s) in table`} />
        <ReviewRow label="Visible to Customer" value={`${formData.emiPlans.filter((p) => p.enabled && p.customerVisibility === 'visible').length} option(s)`} />
        <ReviewRow label="Service Charge Method" value={formData.serviceChargeMethod || '—'} />
        <ReviewRow label="Min Down Payment" value={formData.minCustomerDownPayment ? formatCurrency(parseFloat(formData.minCustomerDownPayment)) : '—'} />
        <ReviewRow label="Grace Period" value={formData.gracePeriod ? `${formData.gracePeriod} days` : '—'} />
      </ReviewCard>

      <ReviewCard title="SEO">
        <ReviewRow label="Slug" value={formData.slug || '—'} />
        <ReviewRow label="Meta Title" value={formData.metaTitle || '—'} />
      </ReviewCard>
    </View>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function formatReviewValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => formatReviewValue(item)).filter((v) => v !== '—');
    return parts.length ? parts.join(', ') : '—';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const parts = [obj.color, obj.storageOrSize, obj.size, obj.variant, obj.label]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    if (parts.length) return parts.join(' / ');
  }
  return '—';
}

function ReviewRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: unknown;
  highlight?: boolean;
}) {
  const display = formatReviewValue(value);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.highlight]} numberOfLines={2}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  card: { marginTop: spacing.lg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textHeading, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  label: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },
  highlight: { color: colors.accentDark },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 60, height: 60, borderRadius: 8 },
});
