import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { fireModelDeployed } from '../../../shared/tracking/deploymentTracking';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type UseExitWizardOptions = {
  returnRoute?: string;
  cancelReturnRoute?: string;
  isEdit?: boolean;
  formData: UseModelDeploymentWizardState;
};

type UseExitWizardReturn = {
  isExitModalOpen: boolean;
  openExitModal: () => void;
  closeExitModal: () => void;
  handleExitConfirm: () => void;
  exitWizardOnSubmit: () => void;
};

export const useExitDeploymentWizard = ({
  returnRoute,
  cancelReturnRoute,
  isEdit,
  formData,
}: UseExitWizardOptions): UseExitWizardReturn => {
  const navigate = useNavigate();
  const trackEvent = useTrackEvent();

  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false);

  const openExitModal = React.useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  const closeExitModal = React.useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  const exitWizardOnCancel = React.useCallback(() => {
    navigate(cancelReturnRoute ?? returnRoute ?? '/ai-hub/models/deployments');
  }, [navigate, cancelReturnRoute, returnRoute]);

  const exitWizardOnSubmit = React.useCallback(() => {
    navigate(returnRoute ?? '/ai-hub/models/deployments');
  }, [navigate, returnRoute]);

  const deploymentMethod = formData.state.deploymentMethod?.method;
  const handleExitConfirm = React.useCallback(() => {
    fireModelDeployed(
      trackEvent,
      {
        outcome: TrackingOutcome.cancel,
        ...(deploymentMethod && { deploymentMethod }),
      },
      isEdit,
    );
    setIsExitModalOpen(false);
    exitWizardOnCancel();
  }, [trackEvent, exitWizardOnCancel, isEdit, deploymentMethod]);

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal,
    handleExitConfirm,
    exitWizardOnSubmit,
  };
};
