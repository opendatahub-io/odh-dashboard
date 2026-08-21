import * as React from 'react';
import EmptyStateErrorMessage from './EmptyStateErrorMessage';
import ProjectSelectorNavigator from './projectSelector/ProjectSelectorNavigator';

export type InvalidProjectProps = {
  title?: string;
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
};

const InvalidProject: React.FC<InvalidProjectProps> = ({ namespace, title, getRedirectPath }) => (
  <EmptyStateErrorMessage
    title={title || 'Project not found'}
    bodyText={`${namespace ? `Project ${namespace}` : 'The project'} was not found.`}
  >
    <ProjectSelectorNavigator
      getRedirectPath={getRedirectPath}
      invalidDropdownPlaceholder="Select project"
      primary
    />
  </EmptyStateErrorMessage>
);

export default InvalidProject;
