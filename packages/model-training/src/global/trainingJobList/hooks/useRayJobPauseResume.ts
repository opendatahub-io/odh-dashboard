import * as React from 'react';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import usePauseRayJobModalAvailability from './usePauseRayJobModalAvailability';
import { RayJobKind } from '../../../k8sTypes';
import { RayJobState } from '../../../types';
import { setRayJobPauseState } from '../../../api';

type UseRayJobPauseResumeResult = {
  isSubmitting: boolean;
  pauseModalOpen: boolean;
  closePauseModal: () => void;
  onPauseClick: () => void;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  dontShowModalValue: boolean;
  setDontShowModalValue: (value: boolean) => void;
};

export const useRayJobPauseResume = (
  job: RayJobKind | null | undefined,
  onStatusUpdate?: (jobId: string, newStatus: RayJobState) => void,
): UseRayJobPauseResumeResult => {
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pauseModalOpen, setPauseModalOpen] = React.useState(false);
  const [dontShowModalValue, setDontShowModalValue] = usePauseRayJobModalAvailability();

  const togglePauseState = React.useCallback(
    async (pause: boolean) => {
      if (!job) {
        return;
      }

      const action = pause ? 'pause' : 'resume';
      const newStatus = pause ? RayJobState.PAUSED : RayJobState.RUNNING;

      setIsSubmitting(true);
      try {
        const result = await setRayJobPauseState(job, pause);
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
        setIsSubmitting(false);
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
      void handlePause();
    } else {
      setPauseModalOpen(true);
    }
  }, [dontShowModalValue, handlePause]);

  const closePauseModal = React.useCallback(() => {
    setDontShowModalValue(false);
    setPauseModalOpen(false);
  }, [setDontShowModalValue]);

  return {
    isSubmitting,
    pauseModalOpen,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  };
};
