import * as React from 'react';
import SpawnerPage from './SpawnerPage';
import { useParams } from 'react-router';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { getProjectDisplayName } from '../../utils';
import { NotebookState } from '../../notebook/types';

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
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Problem loading project details
          </Title>
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            View my projects
          </Button>
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
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Unable to edit workbench
          </Title>
          <EmptyStateBody>
            We were unable to find a notebook by this name in your project{' '}
            {getProjectDisplayName(currentProject)}.
          </EmptyStateBody>
          <Button
            variant="primary"
            onClick={() => navigate(`/projects/${currentProject.metadata.name}`)}
          >
            Return to {getProjectDisplayName(currentProject)}
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  return <SpawnerPage existingNotebook={ref.current.notebook} />;
};

export default EditSpawnerPage;
