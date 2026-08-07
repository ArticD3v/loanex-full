import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWizard } from '../WizardContext';
import { Input } from '../../../../components/ui/Input';
import { Card } from '../../../../components/ui/Card';
import { colors } from '../../../../theme/colors';
import { spacing } from '../../../../theme/spacing';

export function Step10SEO() {
  const { formData, updateForm } = useWizard();

  useEffect(() => {
    if (formData.productName && !formData.slug) {
      const slug = formData.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      updateForm({ slug });
    }
  }, [formData.productName]);

  useEffect(() => {
    if (formData.productName && !formData.metaTitle) {
      updateForm({ metaTitle: `${formData.productName} | Buy Online` });
    }
  }, [formData.productName]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>SEO</Text>
      <Text style={styles.subheading}>Optimize product for search engines and marketplace discovery</Text>

      <Card>
        <Input
          label="Slug"
          placeholder="product-url-slug"
          value={String(formData.slug ?? '')}
          onChangeText={(v) => updateForm({ slug: v })}
          hint="URL-friendly identifier for the product page"
        />

        <Input
          label="Meta Title"
          placeholder="Page title for search results"
          value={String(formData.metaTitle ?? '')}
          onChangeText={(v) => updateForm({ metaTitle: v })}
          maxLength={60}
          hint={`${String(formData.metaTitle ?? '').length}/60 characters`}
        />

        <Input
          label="Meta Description"
          placeholder="Brief description for search results"
          value={String(formData.metaDescription ?? '')}
          onChangeText={(v) => updateForm({ metaDescription: v })}
          multiline
          maxLength={160}
          hint={`${String(formData.metaDescription ?? '').length}/160 characters`}
        />

        <Input
          label="Keywords"
          placeholder="smartphone, samsung, galaxy, 5g"
          value={String(formData.keywords ?? '')}
          onChangeText={(v) => updateForm({ keywords: v })}
          hint="Comma-separated keywords for search indexing"
        />
      </Card>

      {Boolean(formData.metaTitle) && (
        <Card style={styles.preview}>
          <Text style={styles.previewLabel}>Search Preview</Text>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {String(formData.metaTitle)}
          </Text>
          <Text style={styles.previewUrl}>
            {`yoursite.com/products/${formData.slug || 'product-slug'}`}
          </Text>
          <Text style={styles.previewDesc} numberOfLines={2}>
            {String(
              formData.metaDescription ||
                formData.shortDescription ||
                'No description provided.',
            )}
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxxl },
  heading: { fontSize: 20, fontWeight: '800', color: colors.textHeading },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  preview: { marginTop: spacing.lg, backgroundColor: colors.borderLight },
  previewLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  previewTitle: { fontSize: 18, color: '#1a0dab', fontWeight: '400' },
  previewUrl: { fontSize: 13, color: colors.success, marginTop: 2 },
  previewDesc: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
});
