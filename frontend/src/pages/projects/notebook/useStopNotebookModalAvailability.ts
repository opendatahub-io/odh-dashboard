import { useBrowserStorage } from '../../../components/browserStorage';

const useStopNotebookModalAvailability = (): [boolean, (v: boolean) => void] => {
  return useBrowserStorage<boolean>('odh.dashboard.dsg.stop.modal.preference', false);
};

export default useStopNotebookModalAvailability;
