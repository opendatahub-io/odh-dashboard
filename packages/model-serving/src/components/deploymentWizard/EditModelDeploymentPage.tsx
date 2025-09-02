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
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { ModelDeploymentWizardData } from './useDeploymentWizard';
import { Deployment, isModelServingDeploymentResourcesExtension } from '../../../extension-points';
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
            <Button variant="primary" onClick={() => navigate(`/modelServing/`)}>
              Return to model serving
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
      <ErrorContent
        error={
          clusterPlatformsError ??
          new Error(
            !currentProject
              ? `Project ${namespace ?? ''} not found.`
              : !activePlatform
              ? 'No model serving platform is configured for this project.'
              : 'Unknown error',
          )
        }
      />
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
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const [
    extractHWProfileExtension,
    extractHWProfileExtensionLoaded,
    extractHWProfileExtensionErrors,
  ] = useResolvedDeploymentExtension(
    isModelServingDeploymentResourcesExtension,
    existingDeployment,
  );

  const extractFormDataFromDeployment: (deployment: Deployment) => ModelDeploymentWizardData = (
    deployment: Deployment,
  ) => ({
    k8sNameDesc: setupDefaults({ initialData: deployment.model }),
    hardwareProfile:
      extractHWProfileExtension?.properties.extractHardwareProfileConfig(deployment) ?? undefined,
  });

  const formData = React.useMemo(() => {
    if (existingDeployment) {
      return extractFormDataFromDeployment(existingDeployment);
    }
    return undefined;
  }, [existingDeployment, extractFormDataFromDeployment]);

  if (extractHWProfileExtensionErrors.length > 0) {
    return <ErrorContent error={new Error('Unable to extract hardware profile config')} />;
  }

  if (!deploymentsLoaded || !extractHWProfileExtensionLoaded) {
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
