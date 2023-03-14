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
import { Link } from 'react-router-dom';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate }) => (
  <EmptyState>
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h2" size="lg">
      No data science projects yet.
    </Title>
    <EmptyStateBody>
      To get started, create a data science project or launch a notebook with Jupyter.
    </EmptyStateBody>
    {allowCreate && <NewProjectButton />}
    <EmptyStateSecondaryActions>
      <Button
        variant="link"
        component={() => <Link to="/notebookController">Launch Jupyter</Link>}
      />
    </EmptyStateSecondaryActions>
  </EmptyState>
);

export default EmptyProjects;
