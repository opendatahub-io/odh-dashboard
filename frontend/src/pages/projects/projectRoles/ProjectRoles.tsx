import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
  PageSection,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';

const ProjectRoles: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  return (
    <PageSection hasBodyWrapper={false} data-testid="project-roles-tab">
      <EmptyState headingLevel="h2" icon={PlusCircleIcon} titleText="No custom roles">
        <EmptyStateBody>
          Custom roles allow you to define fine-grained permissions for project members.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              component={(props) => <Link {...props} to={`/projects/${namespace}/roles/create`} />}
              data-testid="create-role-button"
            >
              Create role
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );
};

export default ProjectRoles;
