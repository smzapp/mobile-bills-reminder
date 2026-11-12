import { useLocalSearchParams } from 'expo-router';

import { CategoryForm } from '@/features/categories/category-form';

export default function CategoryEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryForm categoryId={id === 'new' ? null : id} />;
}
