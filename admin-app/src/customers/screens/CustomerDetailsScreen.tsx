import React, { useState, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Customer } from '../../types/customer';
import { getCustomerById } from '../../services/customerService';
import { CustomerDetailView } from '../components/CustomerDetailView';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetails'>;

export function CustomerDetailsScreen({ navigation, route }: Props) {
  const [customer, setCustomer] = useState<Customer | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const data = await getCustomerById(route.params.customerId);
        if (isMounted) {
          setCustomer(data);
        }
      } catch (err) {
        console.error('Error fetching customer details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchCustomer();
    return () => {
      isMounted = false;
    };
  }, [route.params.customerId]);

  return (
    <CustomerDetailView
      navigation={navigation}
      screenTitle="Customer Details"
      customer={customer}
      loading={loading}
    />
  );
}
