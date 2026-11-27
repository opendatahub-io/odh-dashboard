import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import WhosMyAdministrator from './WhosMyAdministrator';
import projectsEmptyStateImg from '../images/empty-state-projects-color.svg';

type EmptyProjectsProps = {
  allowCreate: boolean;
  creationActions?: React.ReactNode;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate, creationActions }) => (
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
        creationActions
      ) : (
        <WhosMyAdministrator
          contentTestId="projects-empty-admin-help-content"
          linkTestId="projects-empty-admin-help"
        />
      )}
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyProjects;
