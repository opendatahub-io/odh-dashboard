import * as React from 'react';
import { EmptyState, EmptyStateFooter, EmptyStateBody } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';

const NoProjectsEmptyState: React.FC<{
  message: string;
  testId: string;
  getRedirectPath: (namespace: string) => string;
}> = ({ message, testId, getRedirectPath }) => {
  const navigate = useNavigate();
  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No data science projects"
      data-testid={testId}
    >
      <EmptyStateBody>{message}</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(getRedirectPath(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default NoProjectsEmptyState;
