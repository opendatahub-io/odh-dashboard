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
import { Deployment } from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';

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

  const existingDeployment = React.useMemo(() => {
    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, deploymentName]);

  const extractFormDataFromDeployment: (deployment: Deployment) => ModelDeploymentWizardData = (
    deployment: Deployment,
  ) => ({
    k8sNameDesc: setupDefaults({ initialData: deployment.model }),
  });

  const formData = React.useMemo(() => {
    if (existingDeployment) {
      return extractFormDataFromDeployment(existingDeployment);
    }
    return undefined;
  }, [existingDeployment, extractFormDataFromDeployment]);

  if (!loaded) {
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
