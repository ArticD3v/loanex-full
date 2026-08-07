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
import { MASTER_SECTIONS, MasterListEntityKey } from '../data/masterEntities';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MastersHome'>;

export function MastersHomeScreen({ navigation }: Props) {
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SettingsHome');
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
        <Text style={styles.headerTitle}>Masters</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Master data settings</Text>

        {MASTER_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => {
                  if (item.id === 'categories') {
                    navigation.navigate('CategoriesMaster');
                  } else {
                    navigation.navigate('MasterList', {
                      entity: item.id as MasterListEntityKey,
                    });
                  }
                }}
              >
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={item.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.textWrap}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
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
