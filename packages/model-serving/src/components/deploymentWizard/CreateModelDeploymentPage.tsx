import React from 'react';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { useModelDeploymentWizard } from './useDeploymentWizard';
import { ModelDeploymentsProvider } from '../../concepts/ModelDeploymentsContext';

const CreateModelDeploymentPage: React.FC = () => {
  const wizardState = useModelDeploymentWizard();
  const { connectionsLoaded } = wizardState.state.modelLocationData;

  const { namespace } = useParams();
  const navigate = useNavigate();

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));

  if (!projectsLoaded || !connectionsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!currentProject) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText="Unable to create model deployment"
        >
          <EmptyStateBody>{`Project ${namespace ?? ''} not found.`}</EmptyStateBody>
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
  }

  return (
    <ModelDeploymentsProvider projects={[currentProject]}>
      <ModelDeploymentWizard
        title="Deploy a model"
        description="Configure deployment options for this model version."
        primaryButtonText="Deploy model"
        project={currentProject}
      />
    </ModelDeploymentsProvider>
  );
};

export default CreateModelDeploymentPage;
