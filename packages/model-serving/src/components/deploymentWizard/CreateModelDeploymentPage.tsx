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

const CreateModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));

  if (!projectsLoaded) {
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
    <ModelDeploymentWizard
      title="Deploy a model"
      description="Configure and deploy your model."
      primaryButtonText="Deploy model"
      project={currentProject}
    />
  );
};

export default CreateModelDeploymentPage;
