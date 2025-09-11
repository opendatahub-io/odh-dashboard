import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import projectsEmptyStateImg from '#~/images/empty-state-projects-color.svg';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate }) => {
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
            <NewProjectButton
              onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
            />
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
