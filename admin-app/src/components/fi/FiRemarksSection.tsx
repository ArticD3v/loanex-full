import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { SectionTitle } from '../ui/SectionTitle';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface FiRemarksSectionProps {
  remarks: string;
  readOnly: boolean;
  onChange: (text: string) => void;
}

export function FiRemarksSection({ remarks, readOnly, onChange }: FiRemarksSectionProps) {
  return (
    <Card style={styles.section}>
      <SectionTitle title="Remarks" />
      {readOnly ? (
        <Text style={styles.readOnly}>{remarks.trim() ? remarks : '—'}</Text>
      ) : (
        <Input
          value={remarks}
          onChangeText={onChange}
          placeholder="Enter Field Investigation Remarks..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.input}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  readOnly: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.text,
  },
  input: {
    minHeight: 100,
    marginBottom: 0,
  },
});
