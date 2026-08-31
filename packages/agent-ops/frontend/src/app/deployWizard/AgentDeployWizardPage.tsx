import * as React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { agentOpsDeploymentsRoute, sanitizeAgentOpsReturnRoute } from '~/app/utilities/routes';
import AgentDeployWizard from './AgentDeployWizard';
import { isValidAgentName } from './utils';
import { isDeployAgentWizardLocationState, type DeployAgentWizardLocationState } from './types';

const AgentDeployWizardPage: React.FC = () => {
  const location = useLocation();
  const { namespace: routeNamespace } = useParams<{ namespace: string }>();
  const wizardState: DeployAgentWizardLocationState = isDeployAgentWizardLocationState(
    location.state,
  )
    ? location.state
    : {};
  const { returnRoute } = wizardState;
  const namespace = routeNamespace ?? wizardState.namespace;

  if (!namespace || !isValidAgentName(namespace)) {
    return <Navigate to={agentOpsDeploymentsRoute()} replace />;
  }

  const safeReturnRoute = sanitizeAgentOpsReturnRoute(returnRoute, namespace);

  return <AgentDeployWizard namespace={namespace} returnRoute={safeReturnRoute} />;
};

export default AgentDeployWizardPage;
