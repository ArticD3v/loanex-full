import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { findDownPayment } from '../data/emiLifecycleMockData';
import { RootStackParamList } from '../../navigation/types';
import { EmiLifecycleDetailScreen } from './EmiLifecycleDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'DownPaymentDetails'>;

export function DownPaymentDetailsScreen({ route }: Props) {
  const details = findDownPayment(route.params.applicationId);
  return (
    <EmiLifecycleDetailScreen
      title="Down Payment"
      sectionTitle="Down Payment Details"
      rows={[
        { label: 'Application', value: details.applicationId },
        { label: 'Current Status', value: details.status },
        { label: 'Amount', value: details.amount },
        { label: 'Payment Mode', value: details.mode },
        { label: 'Reference', value: details.reference },
        { label: 'Paid On', value: details.paidOn },
        { label: 'Collected By', value: details.collectedBy },
        { label: 'Completed By', value: details.completedBy ?? details.collectedBy },
        { label: 'Completed Date & Time', value: details.completedAt ?? details.paidOn },
        { label: 'Remarks', value: details.remarks },
      ]}
    />
  );
}
