import { DispatchDetails } from '../../types/dispatch';

export const MOCK_DISPATCHES: DispatchDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    dispatchStatus: 'In Transit',
    courierName: 'BlueDart',
    trackingNumber: 'BD2026072900145',
    dispatchDate: '2026-07-30',
    expectedDelivery: '2026-08-02',
  },
];

export function findDispatch(applicationId: string): DispatchDetails | undefined {
  return MOCK_DISPATCHES.find((item) => item.applicationId === applicationId);
}
