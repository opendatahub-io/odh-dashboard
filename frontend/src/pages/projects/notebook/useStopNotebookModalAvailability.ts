import { useBrowserStorage } from '@odh-dashboard/plugin-core/utilities';

const useStopNotebookModalAvailability = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>('odh.dashboard.dsg.stop.modal.preference', false);

export default useStopNotebookModalAvailability;
