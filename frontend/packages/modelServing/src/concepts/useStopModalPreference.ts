import { useBrowserStorage } from '@odh-dashboard/internal/components/browserStorage/BrowserStorageContext';

export const STOP_MODAL_PREFERENCE_KEY = 'odh.dashboard.modelServing.stop.modal.preference';
const useStopModalPreference = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>(STOP_MODAL_PREFERENCE_KEY, false);

export default useStopModalPreference;
