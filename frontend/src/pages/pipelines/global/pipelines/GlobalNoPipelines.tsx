import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

const GlobalNoPipelines: React.FC = () => (
  <EmptyState>
    <EmptyStateIcon icon={PlusCircleIcon} />
    <Title headingLevel="h4" size="lg">
      No pipelines yet
    </Title>
    <EmptyStateBody>
      To get started, import a pipeline, or create one using the Jupyter visual editor.
    </EmptyStateBody>
    <ImportPipelineButton variant="primary" />
  </EmptyState>
);

export default GlobalNoPipelines;
