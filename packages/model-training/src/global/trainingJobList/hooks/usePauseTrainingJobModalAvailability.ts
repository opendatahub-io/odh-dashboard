import { useBrowserStorage } from '@odh-dashboard/plugin-core/utilities';

const usePauseTrainingJobModalAvailability = (): [boolean, (v: boolean) => void] =>
  useBrowserStorage<boolean>('odh.dashboard.model-training.pause.modal.preference', false);

export default usePauseTrainingJobModalAvailability;
