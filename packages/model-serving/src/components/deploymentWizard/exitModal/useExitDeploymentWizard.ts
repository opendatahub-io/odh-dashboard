import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { fireModelDeployed } from '../../../shared/tracking/deploymentTracking';

type UseExitWizardOptions = {
  returnRoute?: string;
  cancelReturnRoute?: string;
  isEdit?: boolean;
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
}: UseExitWizardOptions): UseExitWizardReturn => {
  const navigate = useNavigate();

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

  const handleExitConfirm = React.useCallback(() => {
    fireModelDeployed({ outcome: TrackingOutcome.cancel }, isEdit);
    setIsExitModalOpen(false);
    exitWizardOnCancel();
  }, [exitWizardOnCancel, isEdit]);

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal,
    handleExitConfirm,
    exitWizardOnSubmit,
  };
};
