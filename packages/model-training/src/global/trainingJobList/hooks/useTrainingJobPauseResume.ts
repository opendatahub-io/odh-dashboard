import * as React from 'react';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import usePauseTrainingJobModalAvailability from './usePauseTrainingJobModalAvailability';
import { TrainJobKind } from '../../../k8sTypes';
import { TrainingJobState } from '../../../types';
import { setTrainJobPauseState } from '../../../api';

type UseTrainingJobPauseResumeResult = {
  isToggling: boolean;
  pauseModalOpen: boolean;
  openPauseModal: () => void;
  closePauseModal: () => void;
  onPauseClick: () => void;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  dontShowModalValue: boolean;
  setDontShowModalValue: (value: boolean) => void;
};

export const useTrainingJobPauseResume = (
  job: TrainJobKind | null | undefined,
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void,
): UseTrainingJobPauseResumeResult => {
  const notification = useNotification();
  const [isToggling, setIsToggling] = React.useState(false);
  const [pauseModalOpen, setPauseModalOpen] = React.useState(false);
  const [dontShowModalValue, setDontShowModalValue] = usePauseTrainingJobModalAvailability();

  const togglePauseState = React.useCallback(
    async (pause: boolean) => {
      if (!job) {
        return;
      }

      const action = pause ? 'pause' : 'resume';
      const newStatus = pause ? TrainingJobState.PAUSED : TrainingJobState.RUNNING;

      setIsToggling(true);
      try {
        const result = await setTrainJobPauseState(job, pause);
        if (result.success) {
          const jobId = job.metadata.uid || job.metadata.name;
          onStatusUpdate?.(jobId, newStatus);
        } else {
          notification.error(`Failed to ${action} job`, result.error || 'Unknown error occurred');
        }
      } catch (error) {
        notification.error(
          `Failed to ${action} job`,
          error instanceof Error ? error.message : 'Unknown error occurred',
        );
      } finally {
        setIsToggling(false);
        if (pause) {
          setPauseModalOpen(false);
        }
      }
    },
    [job, notification, onStatusUpdate],
  );

  const handlePause = React.useCallback(() => togglePauseState(true), [togglePauseState]);
  const handleResume = React.useCallback(() => togglePauseState(false), [togglePauseState]);

  const onPauseClick = React.useCallback(() => {
    if (dontShowModalValue) {
      handlePause();
    } else {
      setPauseModalOpen(true);
    }
  }, [dontShowModalValue, handlePause]);

  const openPauseModal = React.useCallback(() => {
    setPauseModalOpen(true);
  }, []);

  const closePauseModal = React.useCallback(() => {
    setPauseModalOpen(false);
  }, []);

  return {
    isToggling,
    pauseModalOpen,
    openPauseModal,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  };
};
