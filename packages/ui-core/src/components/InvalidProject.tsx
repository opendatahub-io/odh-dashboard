import * as React from 'react';
import EmptyStateErrorMessage from './EmptyStateErrorMessage';
import ProjectSelectorNavigator from './projectSelector/ProjectSelectorNavigator';

export type InvalidProjectProps = {
  title?: string;
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
  syncWorkingProject?: boolean;
  /** Skip the embedded selector when the host already renders one (unified project selector). */
  hideProjectSelector?: boolean;
};

const InvalidProject: React.FC<InvalidProjectProps> = ({
  namespace,
  title,
  getRedirectPath,
  syncWorkingProject,
  hideProjectSelector,
}) => (
  <EmptyStateErrorMessage
    title={title || 'Project not found'}
    bodyText={`${namespace ? `Project ${namespace}` : 'The project'} was not found.`}
  >
    {!hideProjectSelector && (
      <ProjectSelectorNavigator
        getRedirectPath={getRedirectPath}
        syncWorkingProject={syncWorkingProject}
        invalidDropdownPlaceholder="Select project"
        primary
      />
    )}
  </EmptyStateErrorMessage>
);

export default InvalidProject;
