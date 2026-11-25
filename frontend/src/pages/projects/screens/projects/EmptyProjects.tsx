import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
import projectsEmptyStateImg from '#~/images/empty-state-projects-color.svg';
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
    <EmptyState
      data-testid="no-project"
      headingLevel="h2"
      icon={() => <img style={{ height: 320 }} src={projectsEmptyStateImg} alt="no projects" />}
      titleText={allowCreate ? 'Start by creating your project' : 'Start by requesting a project'}
      variant="lg"
    >
      <EmptyStateBody data-testid="projects-empty-body-text">
        Projects allow you and your team to organize and collaborate on resources within separate
        namespaces.{!allowCreate ? ' To request a project, contact your administrator.' : ''}
      </EmptyStateBody>
      <EmptyStateFooter>
        {allowCreate ? (
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
        ) : (
          <WhosMyAdministrator
            contentTestId="projects-empty-admin-help-content"
            linkTestId="projects-empty-admin-help"
          />
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyProjects;
