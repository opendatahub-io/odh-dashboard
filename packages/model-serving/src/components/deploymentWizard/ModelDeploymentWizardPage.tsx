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
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
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

const LLMD_SERVING_ID = 'llmd-serving';

export const ModelDeploymentWizardPage: React.FC = () => {
  const location = useLocation();
  const [viewMode, setViewMode] = React.useState<'form' | 'yaml-preview' | 'yaml-edit'>('form');
  const [selectedModelServer, setSelectedModelServer] = React.useState<string | undefined>();
  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;
  const isLLMdSelected = selectedModelServer === LLMD_SERVING_ID;

  // Extract state from navigation
  const existingData = location.state?.initialData;
  const existingDeployment = location.state?.existingDeployment;
  const returnRoute = location.state?.returnRoute;
  const cancelReturnRoute = location.state?.cancelReturnRoute ?? returnRoute;
  const projectName = location.state?.projectName;
  // refreshKey is used to force the wizard to re-mount when refreshing with updated deployment data
  const refreshKey: number | undefined = location.state?.refreshKey;

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
    <ModelDeploymentsProvider projects={currentProject ? [currentProject] : []}>
      <ModelDeploymentWizard
        key={refreshKey}
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
        cancelReturnRoute={cancelReturnRoute}
        viewMode={viewMode}
        onModelServerChange={setSelectedModelServer}
        headerAction={
          isYAMLViewerEnabled && isLLMdSelected ? (
            <ToggleGroup aria-label="Deployment view mode">
              <ToggleGroupItem
                data-testid="form-view"
                text="Form"
                buttonId="form-view"
                isSelected={viewMode === 'form'}
                onChange={() => setViewMode('form')}
              />
              <ToggleGroupItem
                data-testid="yaml-view"
                text="YAML"
                buttonId="yaml-view"
                isSelected={viewMode === 'yaml-preview'}
                onChange={() => setViewMode('yaml-preview')}
              />
            </ToggleGroup>
          ) : undefined
        }
      />
    </ModelDeploymentsProvider>
  );
};
