import * as React from 'react';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import MlflowExperimentsPage from '../experiments/MlflowExperimentsPage';
import { AGENT_OBSERVABILITY_PAGE_TITLE, WorkflowType } from '../shared/const';
import { agentObservabilityBaseRoute, agentObservabilityPath } from '../shared/routes';

const MlflowAgentObservabilityPage: React.FC = () => (
  <MlflowExperimentsPage
    pageTitle={AGENT_OBSERVABILITY_PAGE_TITLE}
    objectType={ProjectObjectType.mlflow}
    basePath={agentObservabilityPath}
    getRedirectPath={agentObservabilityBaseRoute}
    workflowType={WorkflowType.GENAI}
    launchSection="agent-observability-page"
  />
);

export default MlflowAgentObservabilityPage;
