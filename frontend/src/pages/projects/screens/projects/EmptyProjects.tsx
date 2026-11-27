import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import EmptyProjectsState from '@odh-dashboard/ui-core/components/EmptyProjects';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
  onCreateProject?: () => void;
  onCancel?: () => void;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({
  allowCreate,
  onCreateProject,
  onCancel,
}) => {
  const navigate = useNavigate();

  return (
    <EmptyProjectsState
      allowCreate={allowCreate}
      creationActions={
        allowCreate ? (
          <>
            {onCreateProject ? (
              <Button data-testid="create-project" variant="primary" onClick={onCreateProject}>
                Create project
              </Button>
            ) : (
              <NewProjectButton
                onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
              />
            )}
            {onCancel && (
              <Button data-testid="cancel-create-project" variant="link" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </>
        ) : undefined
      }
    />
  );
};

export default EmptyProjects;
