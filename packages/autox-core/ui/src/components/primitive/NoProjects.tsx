import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

interface NoProjectsProps {
  productName: string;
  /** Empty-state icon, e.g. `() => <img src={emptyStateImage} alt="..." />`. */
  icon: React.ComponentType;
  /** Route the "Go to Projects page" button navigates to. Defaults to `/projects`. */
  projectsRoute?: string;
}

function NoProjects({
  productName,
  icon,
  projectsRoute = '/projects',
}: NoProjectsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState titleText="No projects" headingLevel="h4" icon={icon}>
      <EmptyStateBody>
        To create an {productName} experiment, first create a project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => {
              navigate(projectsRoute);
            }}
          >
            Go to Projects page
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default NoProjects;
