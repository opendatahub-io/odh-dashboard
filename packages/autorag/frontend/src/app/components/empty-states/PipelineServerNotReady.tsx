import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ServerIcon } from '@patternfly/react-icons';
import * as React from 'react';

type PipelineServerNotReadyProps = {
  namespace?: string;
};

function PipelineServerNotReady({ namespace }: PipelineServerNotReadyProps): React.JSX.Element {
  return (
    <EmptyState titleText="Pipeline Server is not ready" headingLevel="h4" icon={ServerIcon}>
      <EmptyStateBody>
        {namespace ? (
          <>
            Data Science Pipelines exists in namespace <strong>{namespace}</strong> but is not ready
            yet. Check that the APIServer component is running, or select a different project.
          </>
        ) : (
          <>
            Data Science Pipelines exists but is not ready yet. Check that the APIServer component
            is running in your project.
          </>
        )}
      </EmptyStateBody>
    </EmptyState>
  );
}

export default PipelineServerNotReady;
