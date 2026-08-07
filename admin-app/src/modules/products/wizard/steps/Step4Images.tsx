import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWizard } from '../WizardContext';
import { ImagePlaceholder } from '../../../../components/ui/ImagePlaceholder';
import { Card } from '../../../../components/ui/Card';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step4Images() {
  const { formData, updateForm } = useWizard();

  const addGalleryImage = () => {
    const mockUrl = `https://picsum.photos/seed/${Date.now()}/200`;
    updateForm({ galleryImages: [...formData.galleryImages, mockUrl] });
    console.log('Gallery image added');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Images</Text>
      <Text style={styles.subheading}>Upload product images for listing and variants</Text>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Image</Text>
        <Text style={styles.sectionDesc}>Main product image shown in listings</Text>
        <ImagePlaceholder
          size="lg"
          imageUri={formData.primaryImage}
          onPress={() => {
            const url = 'https://picsum.photos/seed/primary/400';
            updateForm({ primaryImage: url });
            console.log('Primary image uploaded');
          }}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Gallery Images</Text>
        <Text style={styles.sectionDesc}>Additional product photos (up to 8)</Text>
        <View style={styles.grid}>
          {formData.galleryImages.map((uri, i) => (
            <ImagePlaceholder key={i} size="md" imageUri={uri} />
          ))}
          {formData.galleryImages.length < 8 && (
            <ImagePlaceholder
              size="md"
              label="Add Photo"
              subtitle="Tap to add"
              onPress={addGalleryImage}
            />
          )}
        </View>
      </Card>

      {formData.variantsEnabled && formData.variants.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Variant Images</Text>
          <Text style={styles.sectionDesc}>Assign images to specific variants</Text>
          {formData.variants.map((v) => (
            <View key={v.id} style={styles.variantRow}>
              <Text style={styles.variantLabel}>{v.name}</Text>
              <ImagePlaceholder
                size="sm"
                onPress={() => console.log(`Upload image for ${v.name}`)}
              />
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Preview Grid</Text>
        <View style={styles.grid}>
          {formData.primaryImage && <ImagePlaceholder size="md" imageUri={formData.primaryImage} />}
          {formData.galleryImages.map((uri, i) => (
            <ImagePlaceholder key={i} size="md" imageUri={uri} />
          ))}
          {!formData.primaryImage && formData.galleryImages.length === 0 && (
            <Text style={styles.emptyPreview}>No images uploaded yet</Text>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  variantLabel: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  previewSection: { backgroundColor: colors.borderLight },
  emptyPreview: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
});
