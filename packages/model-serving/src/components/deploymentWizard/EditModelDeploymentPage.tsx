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
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { setupDefaults } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { ModelDeploymentWizardData } from './useDeploymentWizard';
import {
  getModelTypeFromDeployment,
  getTokenAuthenticationFromDeployment,
  getExternalRouteFromDeployment,
  getAnonymousAccessFromDeployment,
} from './utils';
import { Deployment, isModelServingDeploymentFormDataExtension } from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
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
            <Button variant="primary" onClick={() => navigate(`/ai-hub/deployments/`)}>
              Return to deployments
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
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
    <ModelDeploymentsProvider projects={[currentProject]}>
      <EditModelDeploymentContent project={currentProject} />
    </ModelDeploymentsProvider>
  );
};

export default EditModelDeploymentPage;

const EditModelDeploymentContent: React.FC<{
  project: ProjectKind;
}> = ({ project }) => {
  const { name: deploymentName } = useParams();
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const { dashboardNamespace } = useDashboardNamespace();

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const [formDataExtension, formDataExtensionLoaded, formDataExtensionErrors] =
    useResolvedDeploymentExtension(isModelServingDeploymentFormDataExtension, existingDeployment);

  const extractFormDataFromDeployment: (deployment: Deployment) => ModelDeploymentWizardData = (
    deployment: Deployment,
  ) => ({
    modelTypeField: getModelTypeFromDeployment(deployment),
    k8sNameDesc: setupDefaults({ initialData: deployment.model }),
    hardwareProfile:
      typeof formDataExtension?.properties.extractHardwareProfileConfig === 'function'
        ? formDataExtension.properties.extractHardwareProfileConfig(deployment) ?? undefined
        : undefined,
    modelFormat:
      typeof formDataExtension?.properties.extractModelFormat === 'function'
        ? formDataExtension.properties.extractModelFormat(deployment) ?? undefined
        : undefined,
    numReplicas:
      typeof formDataExtension?.properties.extractReplicas === 'function'
        ? formDataExtension.properties.extractReplicas(deployment) ?? undefined
        : undefined,
    modelLocationData:
      typeof formDataExtension?.properties.extractModelLocationData === 'function'
        ? formDataExtension.properties.extractModelLocationData(deployment) ?? undefined
        : undefined,
    externalRoute: getExternalRouteFromDeployment(deployment),
    anonymousAccess: getAnonymousAccessFromDeployment(deployment),
    tokenAuthentication: getTokenAuthenticationFromDeployment(deployment),
    runtimeArgs:
      typeof formDataExtension?.properties.extractRuntimeArgs === 'function'
        ? formDataExtension.properties.extractRuntimeArgs(deployment) ?? undefined
        : undefined,
    environmentVariables:
      typeof formDataExtension?.properties.extractEnvironmentVariables === 'function'
        ? formDataExtension.properties.extractEnvironmentVariables(deployment) ?? undefined
        : undefined,
    aiAssetData:
      typeof formDataExtension?.properties.extractAiAssetData === 'function'
        ? formDataExtension.properties.extractAiAssetData(deployment) ?? undefined
        : undefined,
    modelServer: {
      name: deployment.server?.metadata.annotations?.['opendatahub.io/template-name'] || '',
      namespace:
        deployment.server?.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
        'global'
          ? dashboardNamespace
          : deployment.server?.metadata.namespace || '',
      scope:
        deployment.server?.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] || '',
    },
  });

  const formData = React.useMemo(() => {
    if (existingDeployment) {
      return extractFormDataFromDeployment(existingDeployment);
    }
    return undefined;
  }, [existingDeployment, extractFormDataFromDeployment]);

  if (formDataExtensionErrors.length > 0) {
    return <ErrorContent error={formDataExtensionErrors[0]} />;
  }

  if (!deploymentsLoaded || !formDataExtensionLoaded) {
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
      existingData={formData ? { ...formData, isEditing: true } : { isEditing: true }}
      project={project}
      existingDeployment={existingDeployment}
    />
  );
};
