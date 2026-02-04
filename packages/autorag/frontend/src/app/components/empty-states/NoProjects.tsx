import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

function NoProjects(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState
      titleText="No projects"
      headingLevel="h4"
      icon={() => <img src={emptyStateImage} alt="AutoRAG Infrastructure" />}
    >
      <EmptyStateBody>To create an AutoRAG experiment, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => {
              navigate('/projects');
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
