import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { agentOpsDeploymentsRoute, sanitizeAgentOpsReturnRoute } from '~/app/utilities/routes';

type UseExitDeployAgentWizardOptions = {
  namespace: string;
  returnRoute?: string;
  isDirty?: boolean;
  isDeployFormValid?: boolean;
};

type UseExitDeployAgentWizardReturn = {
  isExitModalOpen: boolean;
  openExitModal: () => void;
  closeExitModal: () => void;
  handleExitConfirm: () => void;
  exitWizard: () => void;
  exitWizardOnSubmit: () => void;
};

export const useExitDeployAgentWizard = (
  options: UseExitDeployAgentWizardOptions,
): UseExitDeployAgentWizardReturn => {
  const { namespace, returnRoute, isDirty = false, isDeployFormValid = false } = options;
  const navigate = useNavigate();
  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false);

  const deploymentsRoute = agentOpsDeploymentsRoute(namespace);
  const cancelRoute = deploymentsRoute;
  const successRoute = sanitizeAgentOpsReturnRoute(returnRoute, namespace);

  const navigateToCancelRoute = React.useCallback(() => {
    navigate(cancelRoute);
  }, [navigate, cancelRoute]);

  const openExitModal = React.useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  const closeExitModal = React.useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  const handleExitConfirm = React.useCallback(() => {
    setIsExitModalOpen(false);
    navigateToCancelRoute();
  }, [navigateToCancelRoute]);

  const exitWizard = React.useCallback(() => {
    if (isDirty) {
      openExitModal();
      return;
    }
    navigateToCancelRoute();
  }, [isDirty, openExitModal, navigateToCancelRoute]);

  const exitWizardOnSubmit = React.useCallback(() => {
    if (!isDeployFormValid) {
      // eslint-disable-next-line no-console -- surfaces unexpected submit attempts during development
      console.error('useExitDeployAgentWizard: exitWizardOnSubmit called with invalid form');
      return;
    }
    // Stub: deploy logic will be implemented in a follow-up.
    navigate(successRoute);
  }, [isDeployFormValid, navigate, successRoute]);

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal,
    handleExitConfirm,
    exitWizard,
    exitWizardOnSubmit,
  };
};
