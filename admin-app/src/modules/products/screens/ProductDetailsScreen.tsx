import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Product } from '../types/product';
import { getProductById } from '../../../services/productService';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/spacing';
import { RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

export function ProductDetailsScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadProduct() {
      try {
        const data = await getProductById(route.params.productId);
        // Map backend to frontend schema
        setProduct({
          id: data.id,
          name: data.name,
          sku: data.sku || '',
          category: data.categoryId || 'Uncategorized',
          brand: data.brand || 'No Brand',
          sellingPrice: Number(data.price) || 0,
          mrp: Number(data.mrp) || Number(data.price) || 0,
          stock: data.stock || 0,
          status: data.status || 'active',
          imageUrl: data.image || null,
        });
      } catch (err) {
        console.warn('Error loading product details', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [route.params.productId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Product Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Product Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Product Details</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProduct', { mode: 'edit', productId: product.id })}
          style={styles.backBtn}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, isTablet && styles.heroTablet]}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={{ fontSize: 64 }}>📦</Text>
            </View>
          )}
          <View style={styles.heroInfo}>
            <Badge status={product.status} />
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.sku}>SKU: {product.sku}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.sellingPrice}>{formatPrice(product.sellingPrice)}</Text>
              {product.mrp > product.sellingPrice && (
                <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
              )}
            </View>
          </View>
        </View>

        <Card style={styles.section}>
          <SectionTitle title="Product Details" />
          <DetailRow label="Category" value={product.category} />
          <DetailRow label="Brand" value={product.brand} />
          <DetailRow label="Stock Available" value={String(product.stock)} />
          <DetailRow label="Status" value={product.status.replace('_', ' ')} />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Pricing Summary" />
          <DetailRow label="MRP" value={formatPrice(product.mrp)} />
          <DetailRow label="Selling Price" value={formatPrice(product.sellingPrice)} />
          <DetailRow
            label="Discount"
            value={`${Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)}%`}
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="outline" style={{ flex: 1 }} />
        <Button
          title="Edit Product"
          onPress={() => navigation.navigate('AddProduct', { mode: 'edit', productId: product.id })}
          variant="primary"
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 64, padding: spacing.sm },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hero: {},
  heroTablet: { flexDirection: 'row', gap: spacing.xxl },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { marginTop: spacing.lg },
  productName: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  sku: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  sellingPrice: { fontSize: 24, fontWeight: '800', color: colors.primary },
  mrp: { fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
});
