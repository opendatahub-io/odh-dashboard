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

const EmptyStateImageIcon = () => <img src={emptyStateImage} alt="AutoRAG Infrastructure" />;

function NoProjects(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState titleText="No projects" headingLevel="h4" icon={EmptyStateImageIcon}>
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
