import { useLocalStorage } from '../../../components/localStorage';

const useStopNotebookModalAvailability = (): [boolean, (v: boolean) => void] => {
  return useLocalStorage<boolean>('odh.dashboard.dsg.stop.modal.preference', false);
};

export default useStopNotebookModalAvailability;
