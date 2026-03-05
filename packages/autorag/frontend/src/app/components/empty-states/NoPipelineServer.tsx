import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ServerIcon } from '@patternfly/react-icons';
import * as React from 'react';

type NoPipelineServerProps = {
  namespace?: string;
};

function NoPipelineServer({ namespace }: NoPipelineServerProps): React.JSX.Element {
  return (
    <EmptyState
      titleText="No Pipeline Server in this namespace"
      headingLevel="h4"
      icon={ServerIcon}
    >
      <EmptyStateBody>
        {namespace ? (
          <>
            No Data Science Pipelines (DSPipelineApplication) was found in namespace{' '}
            <strong>{namespace}</strong>. Install Data Science Pipelines in your project to use
            AutoRAG experiments, or select a different project.
          </>
        ) : (
          <>
            No Data Science Pipelines (DSPipelineApplication) was found. Install Data Science
            Pipelines in your project to use AutoRAG experiments.
          </>
        )}
      </EmptyStateBody>
    </EmptyState>
  );
}

export default NoPipelineServer;
