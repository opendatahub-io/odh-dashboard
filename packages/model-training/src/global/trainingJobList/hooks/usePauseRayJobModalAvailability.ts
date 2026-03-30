import { useBrowserStorage } from '@odh-dashboard/internal/components/browserStorage/BrowserStorageContext';

const usePauseRayJobModalAvailability = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>('odh.dashboard.model-training.pause-ray-job.modal.preference', false);

export default usePauseRayJobModalAvailability;
