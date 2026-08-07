import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
const SETTING_CATEGORIES = [
  { id: 'profile', title: 'My Profile', description: 'View and edit profile details', icon: 'person-circle-outline' },
  { id: 'branches', title: 'Branch Management', description: 'Manage office branches', icon: 'business-outline' },
  { id: 'pincode-master', title: 'Pincode Master', description: 'Manage serviceable pincodes', icon: 'map-outline' },
  { id: 'masters', title: 'Master Data', description: 'Manage entities like brands, categories, suppliers', icon: 'layers-outline' },
];
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsHome'>;

export function SettingsHomeScreen({ navigation }: Props) {
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleGoBack]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Setting categories</Text>
        {SETTING_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            activeOpacity={0.75}
            onPress={() => {
              if (category.id === 'masters') {
                navigation.navigate('MastersHome');
                return;
              }
              if (category.id === 'branches') {
                navigation.navigate('BranchMaster');
                return;
              }
              if (category.id === 'pincode-master') {
                navigation.navigate('PincodeMaster');
                return;
              }
              navigation.navigate('ModulePlaceholder', { title: category.title });
            }}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.cardTitle}>{category.title}</Text>
                  <Text style={styles.cardDesc}>{category.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
