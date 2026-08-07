import React, { useSyncExternalStore } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getLifecycleWorkflowVersion,
  getMandateDetails,
  subscribeLifecycleWorkflow,
} from '../data/emiLifecycleWorkflowStore';
import { RootStackParamList } from '../../navigation/types';
import { EmiLifecycleDetailScreen } from './EmiLifecycleDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'MandateDetails'>;

export function MandateDetailsScreen({ route }: Props) {
  useSyncExternalStore(
    subscribeLifecycleWorkflow,
    getLifecycleWorkflowVersion,
    getLifecycleWorkflowVersion,
  );
  const details = getMandateDetails(route.params.applicationId);
  return (
    <EmiLifecycleDetailScreen
      title="eMandate"
      sectionTitle="eMandate Details"
      rows={[
        { label: 'Application', value: details.applicationId },
        { label: 'Current Status', value: details.status },
        { label: 'Mandate Type', value: details.mandateType },
        { label: 'Bank Account', value: details.bankAccount },
        { label: 'UMRN', value: details.umrn },
        { label: 'Registered On', value: details.registeredOn },
        { label: 'Completed By', value: details.completedBy },
        { label: 'Completed Date & Time', value: details.completedAt },
        { label: 'Remarks', value: details.remarks },
      ]}
    />
  );
}
