import * as React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import { useAgentOpsProjectNamespaces } from '~/app/hooks/useAgentOpsProjectNamespaces';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import AgentDeploymentListPage from './AgentDeploymentListPage';

const AgentDeploymentsCoreLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const {
    bridgeActive,
    preferredProject,
    updatePreferredProject,
    loaded: bridgeLoaded,
    loadError: bridgeLoadError,
  } = useProjectsBridge();
  const { preferredNamespace, updatePreferredNamespace, namespaces } = useNamespaceSelector();
  const {
    projectNamespaces,
    isLoading,
    loadError: projectsLoadError,
  } = useAgentOpsProjectNamespaces();

  const currentProject = namespace
    ? (projectNamespaces.find((project) => project.name === namespace) ?? null)
    : null;

  React.useEffect(() => {
    if (!currentProject) {
      return;
    }

    if (bridgeActive) {
      if (currentProject.name !== preferredProject?.name) {
        updatePreferredProject({ name: currentProject.name });
      }
      return;
    }

    if (currentProject.name !== preferredNamespace?.name) {
      const match = namespaces.find((ns) => ns.name === currentProject.name);
      updatePreferredNamespace(match);
    }
  }, [
    bridgeActive,
    currentProject,
    namespaces,
    preferredNamespace?.name,
    preferredProject?.name,
    updatePreferredNamespace,
    updatePreferredProject,
  ]);

  const projectLoadError = bridgeActive
    ? (bridgeLoadError ?? projectsLoadError)
    : projectsLoadError;

  const projectsReady = bridgeActive ? bridgeLoaded || !!projectLoadError : !isLoading;

  if (!projectsReady) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading projects" />
      </Bullseye>
    );
  }

  if (projectLoadError) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Unable to load projects"
        variant={EmptyStateVariant.lg}
        data-testid="agent-deployments-projects-load-error"
      >
        <EmptyStateBody>Projects could not be loaded. Try again later.</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!namespace) {
    const preferredName = bridgeActive ? preferredProject?.name : preferredNamespace?.name;
    const validPreferred = preferredName
      ? projectNamespaces.find((project) => project.name === preferredName)
      : undefined;
    if (projectNamespaces.length > 0) {
      const redirectName = (validPreferred ?? projectNamespaces[0]).name;
      return <Navigate to={agentOpsDeploymentsRoute(redirectName)} replace />;
    }

    return <AgentDeploymentListPage />;
  }

  if (!currentProject) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Project not found"
        variant={EmptyStateVariant.lg}
        data-testid="agent-deployments-invalid-project"
      >
        <EmptyStateBody>{`Project ${namespace} was not found.`}</EmptyStateBody>
      </EmptyState>
    );
  }

  return <AgentDeploymentListPage />;
};

export default AgentDeploymentsCoreLoader;
