import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

const GlobalNoPipelines: React.FC = () => (
  <EmptyState
    headingLevel="h4"
    icon={PlusCircleIcon}
    titleText="No pipelines yet"
    data-testid="global-no-pipelines"
  >
    <EmptyStateBody>
      To get started, import a pipeline, or create one using the Jupyter visual editor.
    </EmptyStateBody>
    <EmptyStateFooter>
      <ImportPipelineButton variant="primary" />
    </EmptyStateFooter>
  </EmptyState>
);

export default GlobalNoPipelines;
