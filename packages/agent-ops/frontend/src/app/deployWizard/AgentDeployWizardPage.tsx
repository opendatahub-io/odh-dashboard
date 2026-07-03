import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { agentDeploymentsPath, sanitizeAgentOpsReturnRoute } from '~/app/utilities/routes';
import AgentDeployWizard from './AgentDeployWizard';
import { isValidAgentName } from './utils';
import { isDeployAgentWizardLocationState, type DeployAgentWizardLocationState } from './types';

const AgentDeployWizardPage: React.FC = () => {
  const location = useLocation();
  const wizardState: DeployAgentWizardLocationState = isDeployAgentWizardLocationState(
    location.state,
  )
    ? location.state
    : {};
  const { namespace, returnRoute } = wizardState;

  if (!namespace || !isValidAgentName(namespace)) {
    return <Navigate to={agentDeploymentsPath} replace />;
  }

  const safeReturnRoute = sanitizeAgentOpsReturnRoute(returnRoute, namespace);

  return <AgentDeployWizard namespace={namespace} returnRoute={safeReturnRoute} />;
};

export default AgentDeployWizardPage;
