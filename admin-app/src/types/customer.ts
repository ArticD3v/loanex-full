export type EmiStatus = 'running' | 'pending' | 'completed' | 'rejected';
export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  city: string;
  emiStatus: EmiStatus;
  status: CustomerStatus;
  photoUrl?: string;
}
