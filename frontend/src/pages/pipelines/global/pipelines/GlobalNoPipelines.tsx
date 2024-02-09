import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

const GlobalNoPipelines: React.FC = () => (
  <EmptyState data-testid="global-no-pipelines">
    <EmptyStateHeader
      titleText="No pipelines yet"
      icon={<EmptyStateIcon icon={PlusCircleIcon} />}
      headingLevel="h4"
    />
    <EmptyStateBody>
      To get started, import a pipeline, or create one using the Jupyter visual editor.
    </EmptyStateBody>
    <EmptyStateFooter>
      <ImportPipelineButton variant="primary" />
    </EmptyStateFooter>
  </EmptyState>
);

export default GlobalNoPipelines;
