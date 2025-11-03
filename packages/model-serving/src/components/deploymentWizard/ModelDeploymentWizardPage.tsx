import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import {
  Bullseye,
  Button,
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  EmptyState,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { ModelDeploymentsProvider } from '../../concepts/ModelDeploymentsContext';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';

const ErrorContent: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Unable to load model deployment wizard"
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

export const ModelDeploymentWizardPage: React.FC = () => {
  const location = useLocation();

  // Extract state from navigation
  const existingData = location.state?.initialData;
  const existingDeployment = location.state?.existingDeployment;
  const returnRoute = location.state?.returnRoute;
  const projectName = location.state?.projectName;

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = React.useMemo(() => {
    return projectName ? projects.find(byName(projectName)) : undefined;
  }, [projects, projectName]);

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

  if (clusterPlatformsError) {
    return (
      <ErrorContent
        error={
          new Error(
            !currentProject
              ? `Project ${projectName ?? ''} not found.`
              : !activePlatform
              ? 'No model serving platform is configured for this project.'
              : 'Unable to edit model deployment.',
          )
        }
      />
    );
  }

  return (
    <ModelDeploymentsProvider projects={currentProject ? [currentProject] : undefined}>
      <ModelDeploymentWizard
        project={currentProject}
        title={existingDeployment ? 'Edit model deployment' : 'Deploy a model'}
        primaryButtonText={existingDeployment ? 'Update deployment' : 'Deploy model'}
        description={
          existingDeployment
            ? 'Update your model deployment configuration.'
            : 'Configure deployment options for this model version.'
        }
        existingData={existingData}
        existingDeployment={existingDeployment}
        returnRoute={returnRoute}
      />
    </ModelDeploymentsProvider>
  );
};
