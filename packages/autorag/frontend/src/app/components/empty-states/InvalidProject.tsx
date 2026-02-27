import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import ProjectSelectorNavigator from '../common/ProjectSelectorNavigator';

interface InvalidProjectProps {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
}

function InvalidProject(props: InvalidProjectProps): React.JSX.Element {
  return (
    <EmptyState titleText="Project not found" headingLevel="h4">
      <EmptyStateBody>{`${props.namespace ? `Project ${props.namespace}` : 'The Project'} was not found.`}</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <ProjectSelectorNavigator
            namespace={props.namespace}
            getRedirectPath={props.getRedirectPath}
            showTitle
          />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default InvalidProject;
