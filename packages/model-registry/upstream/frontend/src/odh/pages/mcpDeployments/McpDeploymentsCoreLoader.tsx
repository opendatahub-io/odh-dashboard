import * as React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import McpDeploymentsPage from './McpDeploymentsPage';

const McpDeploymentsCoreLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject, updatePreferredProject, loaded, loadError } =
    useProjectsBridge();

  const currentProject = namespace ? (projects.find((p) => p.name === namespace) ?? null) : null;

  React.useEffect(() => {
    if (currentProject && currentProject.name !== preferredProject?.name) {
      updatePreferredProject(currentProject);
    }
  }, [currentProject, preferredProject?.name, updatePreferredProject]);

  if (!loaded && !loadError) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading projects" />
      </Bullseye>
    );
  }

  if (projects.length === 0) {
    return (
      <PageSection hasBodyWrapper={false}>
        <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No data science projects">
          <EmptyStateBody>To view MCP deployments, first create a project.</EmptyStateBody>
        </EmptyState>
      </PageSection>
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
