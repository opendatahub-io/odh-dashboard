import * as React from 'react';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import SpawnerPage from './SpawnerPage';

const EditSpawnerPage: React.FC = () => {
  const {
    currentProject,
    notebooks: { data, loaded, error },
  } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const { notebookName } = useParams();
  const ref = React.useRef<NotebookState>();
  if (!ref.current) {
    ref.current = data.find(
      (notebookState) => notebookState.notebook.metadata.name === notebookName,
    );
  }

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText="Problem loading project details"
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <EmptyStateFooter>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              View my projects
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!ref.current) {
    return (
      <Bullseye>
        <EmptyState
          data-testid="error-message-title"
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText="Unable to edit workbench"
        >
          <EmptyStateBody>
            We were unable to find a notebook by this name in your project{' '}
            {getDisplayNameFromK8sResource(currentProject)}.
          </EmptyStateBody>
          <EmptyStateFooter>
            <Button
              data-testid="return-to-project-button"
              variant="primary"
              onClick={() => navigate(`/projects/${currentProject.metadata.name}`)}
            >
              Return to {getDisplayNameFromK8sResource(currentProject)}
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return <SpawnerPage existingNotebook={ref.current.notebook} />;
};

export default EditSpawnerPage;
