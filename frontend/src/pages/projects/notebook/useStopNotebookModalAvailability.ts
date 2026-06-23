import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const useStopNotebookModalAvailability = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>('odh.dashboard.dsg.stop.modal.preference', false);

export default useStopNotebookModalAvailability;
