import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { useHistory } from 'react-router-dom';

const EmptyProjects: React.FC = () => {
  const history = useHistory();

  return (
    <EmptyState>
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h4" size="lg">
        No data science projects yet.
      </Title>
      <EmptyStateBody>
        To get started, create a data science project or launch a notebook with Jupyter.
      </EmptyStateBody>
      <Button variant="primary">Create data science project</Button>
      <EmptyStateSecondaryActions>
        <Button variant="link" onClick={() => history.push('/notebookController')}>
          Launch notebook
        </Button>
      </EmptyStateSecondaryActions>
    </EmptyState>
  );
};

export default EmptyProjects;
