import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { Namespace } from 'mod-arch-core';
import * as React from 'react';

interface InvalidProjectProps {
  namespace?: string;
  namespaces: Namespace[];
  getRedirectPath: (namespace: string) => string;
}

function InvalidProject(props: InvalidProjectProps): React.JSX.Element {
  return (
    <EmptyState titleText="Project not found" headingLevel="h4">
      <EmptyStateBody>{`${props.namespace ? `Project ${props.namespace}` : 'The Project'} was not found.`}</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <ProjectSelectorNavigator
            getRedirectPath={props.getRedirectPath}
            invalidDropdownPlaceholder="Select project"
            primary
            namespacesOverride={props.namespaces}
          />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default InvalidProject;
