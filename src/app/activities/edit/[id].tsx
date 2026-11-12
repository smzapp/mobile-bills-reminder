import { useLocalSearchParams } from 'expo-router';

import { ActivityForm } from '@/features/activities/activity-form';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivityForm activityId={id} />;
}
