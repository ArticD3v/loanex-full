import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getReportCategories, ReportCategory } from '../../services/reportService';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportsHome'>;

export function ReportsHomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  }, [navigation]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReportCategories();
      setCategories(data);
    } catch (e) {
      console.warn('Failed to fetch report categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleGoBack, fetchCategories]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Report categories</Text>
          <View style={[styles.grid, isTablet && styles.gridTablet]}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.75}
                style={[styles.cardWrap, isTablet && styles.cardWrapTablet]}
                onPress={() =>
                  navigation.navigate('ModulePlaceholder', { title: `${category.title} Reports` })
                }
              >
                <Card style={styles.card}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{category.title}</Text>
                  <Text style={styles.cardDesc}>{category.description}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gridTablet: {
    gap: spacing.lg,
  },
  cardWrap: {
    width: '47.5%',
  },
  cardWrapTablet: {
    width: '31%',
  },
  card: {
    minHeight: 148,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
