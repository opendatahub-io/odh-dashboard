import * as React from 'react';
import { EmptyStateErrorMessage } from 'mod-arch-shared';
import GenAiCoreProjectSelector from './GenAiCoreProjectSelector';

type GenAiCoreInvalidProjectProps = {
  title?: string;
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
};

const GenAiCoreInvalidProject: React.FC<GenAiCoreInvalidProjectProps> = ({
  title,
  namespace,
  getRedirectPath,
}) => (
  <EmptyStateErrorMessage
    title={title || 'Project not found'}
    bodyText={`${namespace ? `Project ${namespace}` : 'The Project'} was not found.`}
  >
    <GenAiCoreProjectSelector
      getRedirectPath={getRedirectPath}
      namespace={namespace}
      invalidDropdownPlaceholder="Select project"
      primary
    />
  </EmptyStateErrorMessage>
);

export default GenAiCoreInvalidProject;
