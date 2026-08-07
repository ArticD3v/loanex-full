import React, { useSyncExternalStore } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getEkycDetails,
  getLifecycleWorkflowVersion,
  subscribeLifecycleWorkflow,
} from '../data/emiLifecycleWorkflowStore';
import { RootStackParamList } from '../../navigation/types';
import { EmiLifecycleDetailScreen } from './EmiLifecycleDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'EkycDetails'>;

export function EkycDetailsScreen({ route }: Props) {
  useSyncExternalStore(
    subscribeLifecycleWorkflow,
    getLifecycleWorkflowVersion,
    getLifecycleWorkflowVersion,
  );
  const details = getEkycDetails(route.params.applicationId);
  return (
    <EmiLifecycleDetailScreen
      title="eKYC"
      sectionTitle="eKYC Details"
      rows={[
        { label: 'Application', value: details.applicationId },
        { label: 'Current Status', value: details.status },
        { label: 'Method', value: details.method },
        { label: 'Aadhaar', value: details.aadhaarMasked },
        { label: 'Verified On', value: details.verifiedOn },
        { label: 'Verified By', value: details.verifiedBy },
        { label: 'Completed By', value: details.completedBy },
        { label: 'Completed Date & Time', value: details.completedAt },
        { label: 'Remarks', value: details.remarks },
      ]}
    />
  );
}
