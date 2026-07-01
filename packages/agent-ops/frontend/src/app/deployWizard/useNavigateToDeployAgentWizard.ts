import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  agentOpsDeploymentsRoute,
  getAgentDeployWizardRoute,
  isSafeAgentOpsInternalRoute,
} from '~/app/utilities/routes';
import type { DeployAgentWizardLocationState } from './types';

export const useNavigateToDeployAgentWizard = (): ((namespace?: string) => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  return React.useCallback(
    (namespace?: string) => {
      if (!namespace) {
        return;
      }

      const returnRoute = isSafeAgentOpsInternalRoute(location.pathname)
        ? location.pathname
        : agentOpsDeploymentsRoute(namespace);

      const state: DeployAgentWizardLocationState = {
        namespace,
        returnRoute,
      };

      navigate(getAgentDeployWizardRoute(), { state });
    },
    [navigate, location.pathname],
  );
};
