import { createUseNotification } from '@odh-dashboard/autox-core/ui/hooks';
import { useStore } from '~/app/store';

export const useNotification = createUseNotification(
  () => useStore((state) => state.addNotification),
  () => useStore((state) => state.removeNotification),
);
