import React, { useSyncExternalStore } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getDisbursementDetails,
  getLifecycleWorkflowVersion,
  subscribeLifecycleWorkflow,
} from '../data/emiLifecycleWorkflowStore';
import { RootStackParamList } from '../../navigation/types';
import { EmiLifecycleDetailScreen } from './EmiLifecycleDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'DisbursementDetails'>;

export function DisbursementDetailsScreen({ route }: Props) {
  useSyncExternalStore(
    subscribeLifecycleWorkflow,
    getLifecycleWorkflowVersion,
    getLifecycleWorkflowVersion,
  );
  const details = getDisbursementDetails(route.params.applicationId);
  return (
    <EmiLifecycleDetailScreen
      title="Disbursement"
      sectionTitle="Disbursement Details"
      rows={[
        { label: 'Application', value: details.applicationId },
        { label: 'Current Status', value: details.status },
        { label: 'Amount', value: details.amount },
        { label: 'Disbursed To', value: details.disbursedTo },
        { label: 'Transaction ID', value: details.transactionId },
        { label: 'Disbursed On', value: details.disbursedOn },
        { label: 'Completed By', value: details.completedBy },
        { label: 'Completed Date & Time', value: details.completedAt },
        { label: 'Remarks', value: details.remarks },
      ]}
    />
  );
}
