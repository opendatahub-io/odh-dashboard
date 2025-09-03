import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import {
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
  getUniqueId,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { setupDefaults } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import useServingRuntimeSecrets from '@odh-dashboard/internal/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { ModelDeploymentWizardData } from './useDeploymentWizard';
import { AdvancedSettingsFieldData } from './fields/AdvancedSettingsSelectField';
import { Deployment } from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';

// Utility function to extract advanced settings from deployment
const extractAdvancedSettingsFromDeployment = (
  deployment: Deployment,
  projectSecrets: Array<{ metadata: { name: string; annotations?: Record<string, string> } }> = [],
): AdvancedSettingsFieldData => {
  // Check if deployment has external routes
  const hasExternalRoute =
    deployment.endpoints?.some((endpoint) => endpoint.type === 'external') ?? false;

  // Check if token auth is enabled
  const hasTokenAuth =
    deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

  // Extract tokens from secrets
  const { serviceAccountName } = getTokenNames(
    deployment.model.metadata.name,
    deployment.model.metadata.namespace,
  );

  const deploymentSecrets = projectSecrets.filter(
    (secret) =>
      secret.metadata.annotations?.['kubernetes.io/service-account.name'] === serviceAccountName,
  );

  const tokens = deploymentSecrets.map((secret) => ({
    uuid: getUniqueId('ml'),
    name:
      secret.metadata.annotations?.['kubernetes.io/service-account.name'] || secret.metadata.name,
    error: undefined,
  }));

  return {
    externalRoute: hasExternalRoute,
    tokenAuth: hasTokenAuth,
    tokens,
  };
};

const EditModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));

  const { clusterPlatforms, clusterPlatformsLoaded, clusterPlatformsError } =
    useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(currentProject, clusterPlatforms);

  if (!projectsLoaded || !clusterPlatformsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!currentProject || !activePlatform || clusterPlatformsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText="Unable to edit model deployment"
        >
          <EmptyStateBody>
            {!currentProject
              ? `Project ${namespace ?? ''} not found.`
              : !activePlatform
              ? 'No model serving platform is configured for this project.'
              : clusterPlatformsError
              ? `Error loading cluster platforms: ${clusterPlatformsError.message}`
              : 'Unable to edit model deployment.'}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => navigate(`/modelServing/`)}>
                Return to model serving
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentsProvider modelServingPlatforms={[activePlatform]} projects={[currentProject]}>
      <EditModelDeploymentContent project={currentProject} />
    </ModelDeploymentsProvider>
  );
};

export default EditModelDeploymentPage;

const EditModelDeploymentContent: React.FC<{ project: ProjectKind }> = ({ project }) => {
  const { name: deploymentName } = useParams();
  const { deployments, loaded } = React.useContext(ModelDeploymentsContext);
  const serverSecrets = useServingRuntimeSecrets(project.metadata.namespace);

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const extractFormDataFromDeployment = React.useCallback(
    (deployment: Deployment): ModelDeploymentWizardData => ({
      k8sNameDesc: setupDefaults({ initialData: deployment.model }),
      advancedSettingsField: extractAdvancedSettingsFromDeployment(deployment, serverSecrets.data),
    }),
    [serverSecrets.data],
  );

  const formData = React.useMemo(() => {
    if (existingDeployment && serverSecrets.loaded) {
      return extractFormDataFromDeployment(existingDeployment);
    }
    return undefined;
  }, [existingDeployment, extractFormDataFromDeployment, serverSecrets.loaded]);

  if (!loaded || !serverSecrets.loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentWizard
      title="Edit model deployment"
      description="Update your model deployment configuration."
      primaryButtonText="Update deployment"
      existingData={formData}
      project={project}
    />
  );
};
