import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import ProjectSelectorNavigator, {
  type ProjectSelectorNavigatorProps,
} from './ProjectSelectorNavigator';

export type InvalidProjectProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
  onProjectSelected?: ProjectSelectorNavigatorProps['onProjectSelected'];
  emptyNamespaceText?: string;
};

const InvalidProject: React.FC<InvalidProjectProps> = ({
  namespace,
  getRedirectPath,
  onProjectSelected,
  emptyNamespaceText = 'The project',
}) => (
  <EmptyState titleText="Project not found" headingLevel="h4">
    <EmptyStateBody>
      {`${namespace ? `Project ${namespace}` : emptyNamespaceText} was not found.`}
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <ProjectSelectorNavigator
          namespace={namespace}
          getRedirectPath={getRedirectPath}
          onProjectSelected={onProjectSelected}
          showTitle
        />
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default InvalidProject;
