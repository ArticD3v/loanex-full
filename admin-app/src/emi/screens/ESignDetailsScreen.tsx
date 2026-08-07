import React, { useSyncExternalStore } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getESignDetails,
  getLifecycleWorkflowVersion,
  subscribeLifecycleWorkflow,
} from '../data/emiLifecycleWorkflowStore';
import { RootStackParamList } from '../../navigation/types';
import { EmiLifecycleDetailScreen } from './EmiLifecycleDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ESignDetails'>;

export function ESignDetailsScreen({ route }: Props) {
  useSyncExternalStore(
    subscribeLifecycleWorkflow,
    getLifecycleWorkflowVersion,
    getLifecycleWorkflowVersion,
  );
  const details = getESignDetails(route.params.applicationId);
  return (
    <EmiLifecycleDetailScreen
      title="eSign"
      sectionTitle="eSign Details"
      rows={[
        { label: 'Application', value: details.applicationId },
        { label: 'Current Status', value: details.status },
        { label: 'Document Type', value: details.documentType },
        { label: 'Signed By', value: details.signedBy },
        { label: 'Signed On', value: details.signedOn },
        { label: 'Provider', value: details.provider },
        { label: 'Completed By', value: details.completedBy },
        { label: 'Completed Date & Time', value: details.completedAt },
        { label: 'Remarks', value: details.remarks },
      ]}
    />
  );
}
