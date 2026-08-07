import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWizard } from '../WizardContext';
import { useOptionsRegistry } from '../OptionsRegistryContext';
import { Input } from '../../../../components/ui/Input';
import { Dropdown } from '../../../../components/ui/Dropdown';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { ManageableDropdown } from '../../components/ManageableDropdown';
import { Card } from '../../../../components/ui/Card';
import { DELIVERY_CHARGE_METHODS } from '../../data/constants';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step8Delivery() {
  const { formData, updateForm } = useWizard();
  const options = useOptionsRegistry();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Delivery</Text>
      <Text style={styles.subheading}>Configure shipping dimensions, SLA, and delivery policies</Text>

      <Card>
        <Text style={styles.sectionTitle}>Package Dimensions</Text>
        <View style={styles.row}>
          <View style={styles.quarter}>
            <Input label="Weight (kg)" value={formData.weight} onChangeText={(v) => updateForm({ weight: v })} keyboardType="numeric" placeholder="0.0" />
          </View>
          <View style={styles.quarter}>
            <Input label="Length (cm)" value={formData.length} onChangeText={(v) => updateForm({ length: v })} keyboardType="numeric" />
          </View>
          <View style={styles.quarter}>
            <Input label="Width (cm)" value={formData.width} onChangeText={(v) => updateForm({ width: v })} keyboardType="numeric" />
          </View>
          <View style={styles.quarter}>
            <Input label="Height (cm)" value={formData.height} onChangeText={(v) => updateForm({ height: v })} keyboardType="numeric" />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Delivery & Fulfillment</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <Input label="Dispatch SLA" placeholder="e.g. 24 hours" value={formData.dispatchSla} onChangeText={(v) => updateForm({ dispatchSla: v })} />
          </View>
          <View style={styles.half}>
            <Input label="Delivery Charges (₹)" placeholder="e.g. 99" value={formData.deliveryCharges} onChangeText={(v) => updateForm({ deliveryCharges: v })} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input label="Delivery Days" placeholder="e.g. 3-5 days" value={formData.deliveryDays} onChangeText={(v) => updateForm({ deliveryDays: v })} />
          </View>
          <View style={styles.half}>
            <Input label="Replacement Window" placeholder="e.g. 7 days" value={formData.replacementWindow} onChangeText={(v) => updateForm({ replacementWindow: v, replacementDays: v })} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input label="Delivery Code" placeholder="e.g. DEL-ZONE-01" value={formData.deliveryCode} onChangeText={(v) => updateForm({ deliveryCode: v })} />
          </View>
          <View style={styles.half}>
            <ManageableDropdown
              label="Delivery Partner"
              entityName="Delivery Partner"
              value={formData.deliveryPartner}
              options={options.deliveryPartners}
              onSelect={(v) => updateForm({ deliveryPartner: v })}
              onAdd={(name) => options.addDeliveryPartner(name)}
              onRename={(from, to) => options.renameDeliveryPartner(from, to)}
              onDelete={(name) => options.deleteDeliveryPartner(name)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <ManageableDropdown
              label="Delivery Zone"
              entityName="Delivery Zone"
              value={formData.deliveryZone}
              options={options.deliveryZones}
              onSelect={(v) => updateForm({ deliveryZone: v })}
              onAdd={(name) => options.addDeliveryZone(name)}
              onRename={(from, to) => options.renameDeliveryZone(from, to)}
              onDelete={(name) => options.deleteDeliveryZone(name)}
            />
          </View>
          <View style={styles.half}>
            <Dropdown
              label="Delivery Charge Method"
              value={formData.deliveryChargeMethod}
              options={DELIVERY_CHARGE_METHODS}
              onSelect={(v) => updateForm({ deliveryChargeMethod: v })}
            />
          </View>
        </View>

        <ToggleSwitch
          label="Express Delivery"
          description="Offer express delivery for this product"
          value={formData.expressDelivery}
          onValueChange={(v) => updateForm({ expressDelivery: v })}
        />

        <ToggleSwitch
          label="Installation Required"
          description="Product requires professional installation"
          value={formData.installationRequired}
          onValueChange={(v) => updateForm({ installationRequired: v, installationCharge: v ? formData.installationCharge : '' })}
        />

        {formData.installationRequired && (
          <Input
            label="Installation Charge (₹)"
            placeholder="e.g. 499"
            value={formData.installationCharge}
            onChangeText={(v) => updateForm({ installationCharge: v })}
            keyboardType="numeric"
          />
        )}

        <ToggleSwitch
          label="Delivery Confirmation OTP"
          description="Require OTP confirmation at delivery"
          value={formData.deliveryConfirmationOtp}
          onValueChange={(v) => updateForm({ deliveryConfirmationOtp: v })}
        />

        <ToggleSwitch
          label="Serial/IMEI Capture at Delivery"
          description="Capture serial or IMEI when product is delivered"
          value={formData.serialImeiCaptureAtDelivery}
          onValueChange={(v) => updateForm({ serialImeiCaptureAtDelivery: v })}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%' },
  quarter: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, maxWidth: '100%' },
});
