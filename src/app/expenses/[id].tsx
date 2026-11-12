import { useLocalSearchParams } from 'expo-router';

import { ExpenseForm } from '@/features/expenses/expense-form';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExpenseForm expenseId={id} />;
}
