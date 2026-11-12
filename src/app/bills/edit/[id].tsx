import { useLocalSearchParams } from 'expo-router';

import { BillForm } from '@/features/bills/bill-form';

export default function EditBillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BillForm billId={id} />;
}
