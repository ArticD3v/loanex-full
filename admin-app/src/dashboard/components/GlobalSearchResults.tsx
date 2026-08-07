import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '../../services/productService';
import { getAllOrders } from '../../services/orderService';
import { getCustomers } from '../../services/customerService';
import { getAllEmiApplications } from '../../services/emiService';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SectionHeader } from './SectionHeader';

export type SearchResultType = 'product' | 'order' | 'customer' | 'emi';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  icon: string;
}

interface GlobalSearchResultsProps {
  query: string;
  onSelect: (item: SearchResultItem) => void;
}

function matches(query: string, ...fields: (string | number | undefined)[]) {
  const q = query.toLowerCase();
  return fields.some((field) => String(field ?? '').toLowerCase().includes(q));
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  product: 'Products',
  order: 'Orders',
  customer: 'Customers',
  emi: 'EMI Applications',
};

export function GlobalSearchResults({ query, onSelect }: GlobalSearchResultsProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const [products, orders, customers, emiApps] = await Promise.all([
          getProducts().catch(() => []),
          getAllOrders().catch(() => []),
          getCustomers().catch(() => []),
          getAllEmiApplications().catch(() => [])
        ]);

        if (!active) return;

        const q = query.trim();
        
        const filteredProducts: SearchResultItem[] = products.filter((p: any) =>
          matches(q, p.name, p.sku, p.brand, p.categoryId),
        ).map((p: any) => ({
          id: p.id,
          type: 'product',
          title: p.name,
          subtitle: `${p.sku || ''} · ${p.brand || ''}`,
          icon: 'cube-outline',
        }));

        const filteredOrders: SearchResultItem[] = orders.filter((o: any) =>
          matches(q, o.id, o.customer_name, o.customer_phone),
        ).map((o: any) => ({
          id: o.id,
          type: 'order',
          title: o.id,
          subtitle: `${o.customer_name || 'Customer'} · ${o.status || ''}`,
          icon: 'receipt-outline',
        }));

        const filteredCustomers: SearchResultItem[] = customers.filter((c: any) =>
          matches(q, c.name, c.phone, c.id, c.city),
        ).map((c: any) => ({
          id: c.id,
          type: 'customer',
          title: c.name,
          subtitle: `${c.id} · ${c.phone}`,
          icon: 'person-outline',
        }));

        setResults([...filteredProducts, ...filteredOrders, ...filteredCustomers]);
      } catch (err) {
        console.warn('Search error', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    // Debounce the search fetch
    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const grouped = useMemo(() => {
    const order: SearchResultType[] = ['product', 'order', 'customer', 'emi'];
    return order
      .map((type) => ({
        type,
        items: results.filter((r) => r.type === type),
      }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  if (!query.trim()) return null;

  if (results.length === 0) {
    if (loading) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Searching...</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIllustration}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptyDesc}>
          Try searching by name, ID, mobile, SKU, or product.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultCount}>
        {results.length} result{results.length === 1 ? '' : 's'}
      </Text>

      {grouped.map((group) => (
        <View key={group.type} style={styles.section}>
          <SectionHeader title={TYPE_LABELS[group.type]} />
          <View style={styles.groupCard}>
            {group.items.map((item, index) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                style={[
                  styles.resultRow,
                  index === group.items.length - 1 && styles.resultRowLast,
                ]}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultIcon}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    resultCount: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    groupCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...shadow.sm,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: spacing.md,
    },
    resultRowLast: {
      borderBottomWidth: 0,
    },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultContent: {
      flex: 1,
    },
    resultTitle: {
      ...typography.label,
      color: colors.textHeading,
      marginBottom: 2,
    },
    resultSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
      paddingHorizontal: spacing.xxl,
    },
    emptyIllustration: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
