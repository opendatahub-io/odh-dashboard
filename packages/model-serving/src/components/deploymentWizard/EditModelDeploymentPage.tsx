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
import { getModelTypeFromDeployment, setupModelLocationData } from './utils';
import { Deployment, isModelServingDeploymentFormDataExtension } from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import {
  ModelServingPlatform,
  useProjectServingPlatform,
} from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';

const ErrorContent: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Unable to edit model deployment"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
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
};

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

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = React.useMemo(
    () => projects.find(byName(namespace)),
    [projects, namespace],
  );

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
      <ErrorContent
        error={
          clusterPlatformsError ??
          new Error(
            !currentProject
              ? `Project ${namespace ?? ''} not found.`
              : !activePlatform
              ? 'No model serving platform is configured for this project.'
              : 'Unable to edit model deployment.',
          )
        }
      />
    );
  }

  return (
    <ModelDeploymentsProvider modelServingPlatforms={[activePlatform]} projects={[currentProject]}>
      <EditModelDeploymentContent project={currentProject} modelServingPlatform={activePlatform} />
    </ModelDeploymentsProvider>
  );
};

export default EditModelDeploymentPage;

const EditModelDeploymentContent: React.FC<{
  project: ProjectKind;
  modelServingPlatform: ModelServingPlatform;
}> = ({ project, modelServingPlatform }) => {
  const { name: deploymentName } = useParams();
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const serverSecrets = useServingRuntimeSecrets(project.metadata.namespace);

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const [formDataExtension, formDataExtensionLoaded, formDataExtensionErrors] =
    useResolvedDeploymentExtension(isModelServingDeploymentFormDataExtension, existingDeployment);

  const extractFormDataFromDeployment = React.useCallback(
    (deployment: Deployment): ModelDeploymentWizardData => ({
    modelTypeField: getModelTypeFromDeployment(deployment),
      k8sNameDesc: setupDefaults({ initialData: deployment.model }),
    hardwareProfile:
      formDataExtension?.properties.extractHardwareProfileConfig(deployment) ?? undefined,
    modelFormat: formDataExtension?.properties.extractModelFormat(deployment) ?? undefined,
    modelLocationData: setupModelLocationData(), // TODO: Implement fully in next ticket RHOAIENG-32186
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

  if (formDataExtensionErrors.length > 0) {
    return <ErrorContent error={formDataExtensionErrors[0]} />;
  }

  if (!deploymentsLoaded || !formDataExtensionLoaded || !serverSecrets.loaded) {
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
      modelServingPlatform={modelServingPlatform}
    />
  );
};
