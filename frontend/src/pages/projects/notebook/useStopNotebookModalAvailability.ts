import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';

const useStopNotebookModalAvailability = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>('odh.dashboard.dsg.stop.modal.preference', false);

export default useStopNotebookModalAvailability;
