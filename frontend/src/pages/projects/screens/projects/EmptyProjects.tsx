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
import NewProjectButton from './NewProjectButton';
import { Link } from 'react-router-dom';

const EmptyProjects: React.FC = () => {
  return (
    <EmptyState>
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h4" size="lg">
        No data science projects yet.
      </Title>
      <EmptyStateBody>
        To get started, create a data science project or launch a notebook with Jupyter.
      </EmptyStateBody>
      <NewProjectButton />
      <EmptyStateSecondaryActions>
        <Button variant="link">
          <Link to="/notebookController">Launch Jupyter</Link>
        </Button>
      </EmptyStateSecondaryActions>
    </EmptyState>
  );
};

export default EmptyProjects;
