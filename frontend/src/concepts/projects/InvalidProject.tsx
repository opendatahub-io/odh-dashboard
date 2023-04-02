import * as React from 'react';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import ProjectSelector from '~/concepts/projects/ProjectSelector';

type InvalidProjectProps = {
  title?: string;
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
};

const InvalidProject: React.FC<InvalidProjectProps> = ({ namespace, title, getRedirectPath }) => (
  <EmptyStateErrorMessage
    title={title || 'Project not found'}
    bodyText={`${namespace ? `Project ${namespace}` : 'The Project'} was not found.`}
  >
    <ProjectSelector
      getRedirectPath={getRedirectPath}
      invalidDropdownPlaceholder="Select project"
      primary
    />
  </EmptyStateErrorMessage>
);

export default InvalidProject;
