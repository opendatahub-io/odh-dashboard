import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

type UseExitDeployAgentWizardOptions = {
  /** Current project/namespace selected in the wizard form. */
  namespace: string;
  /** Namespace from the route when the wizard was opened. */
  entryNamespace?: string;
  returnRoute?: string;
  isDirty?: boolean;
};

type UseExitDeployAgentWizardReturn = {
  isExitModalOpen: boolean;
  openExitModal: () => void;
  closeExitModal: () => void;
  handleExitConfirm: () => void;
  exitWizard: () => void;
};

/** Prefer returnRoute only when the user has not changed project away from the entry namespace. */
export const resolveDeployWizardCancelRoute = ({
  namespace,
  entryNamespace,
  returnRoute,
}: Pick<
  UseExitDeployAgentWizardOptions,
  'namespace' | 'entryNamespace' | 'returnRoute'
>): string => {
  const projectUnchanged = !entryNamespace || namespace === entryNamespace;
  if (returnRoute && projectUnchanged) {
    return returnRoute;
  }
  return agentOpsDeploymentsRoute(namespace);
};

export const useExitDeployAgentWizard = (
  options: UseExitDeployAgentWizardOptions,
): UseExitDeployAgentWizardReturn => {
  const { namespace, entryNamespace, returnRoute, isDirty = false } = options;
  const navigate = useNavigate();
  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false);

  const cancelRoute = React.useMemo(
    () => resolveDeployWizardCancelRoute({ namespace, entryNamespace, returnRoute }),
    [entryNamespace, namespace, returnRoute],
  );

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

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal,
    handleExitConfirm,
    exitWizard,
  };
};
