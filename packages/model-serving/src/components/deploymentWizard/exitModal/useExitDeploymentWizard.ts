import React from 'react';
import { useNavigate } from 'react-router-dom';

type UseExitWizardOptions = {
  returnRoute?: string;
  cancelReturnRoute?: string;
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
    navigate(cancelReturnRoute ?? returnRoute ?? '/ai-hub/deployments');
  }, [navigate, cancelReturnRoute, returnRoute]);

  const exitWizardOnSubmit = React.useCallback(() => {
    navigate(returnRoute ?? '/ai-hub/deployments');
  }, [navigate, returnRoute]);

  const handleExitConfirm = React.useCallback(() => {
    setIsExitModalOpen(false);
    exitWizardOnCancel();
  }, [exitWizardOnCancel]);

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal,
    handleExitConfirm,
    exitWizardOnSubmit,
  };
};
