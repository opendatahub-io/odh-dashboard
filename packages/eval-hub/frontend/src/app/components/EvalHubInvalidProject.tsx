import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import EvalHubProjectSelector from './EvalHubProjectSelector';

type EvalHubInvalidProjectProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
};

const EvalHubInvalidProject: React.FC<EvalHubInvalidProjectProps> = ({
  namespace,
  getRedirectPath,
}) => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationCircleIcon}
    titleText="Project not found"
    variant={EmptyStateVariant.lg}
    data-testid="eval-hub-invalid-project"
  >
    <EmptyStateBody>
      {namespace ? `Project ${namespace}` : 'The project'} was not found.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EvalHubProjectSelector
        getRedirectPath={getRedirectPath}
        namespace={namespace}
        invalidDropdownPlaceholder="Select project"
        primary
      />
    </EmptyStateFooter>
  </EmptyState>
);

export default EvalHubInvalidProject;
