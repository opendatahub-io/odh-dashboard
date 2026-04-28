import * as React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import McpDeploymentsPage from './McpDeploymentsPage';

const McpDeploymentsCoreLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [searchParams] = useSearchParams();
  const { projects, preferredProject, updatePreferredProject, loaded, loadError } =
    useProjectsBridge();

  const queryNs = searchParams.get('namespace');

  const currentProject = namespace ? (projects.find((p) => p.name === namespace) ?? null) : null;

  React.useEffect(() => {
    if (currentProject) {
      updatePreferredProject(currentProject);
    }
  }, [currentProject, updatePreferredProject]);

  if (!namespace && queryNs) {
    return <Navigate to={mcpDeploymentsUrl(queryNs)} replace />;
  }

  if (!loaded && !loadError) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading projects" />
      </Bullseye>
    );
  }

  if (!namespace) {
    if (preferredProject) {
      return <Navigate to={mcpDeploymentsUrl(preferredProject.name)} replace />;
    }
    return <McpDeploymentsPage />;
  }

  if (!currentProject) {
    return (
      <EmptyState
        icon={ExclamationCircleIcon}
        titleText="Project not found"
        variant={EmptyStateVariant.lg}
        data-testid="mcp-deployments-invalid-project"
      >
        <EmptyStateBody>{`Project ${namespace} was not found.`}</EmptyStateBody>
      </EmptyState>
    );
  }

  return <McpDeploymentsPage namespace={namespace} />;
};

export default McpDeploymentsCoreLoader;
