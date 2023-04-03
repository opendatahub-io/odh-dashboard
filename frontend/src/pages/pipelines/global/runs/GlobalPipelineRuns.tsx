import * as React from 'react';
import { Title, EmptyState } from '@patternfly/react-core';
import { pipelineRunsPageTitle } from '~/pages/pipelines/global/runs/const';
import { pipelinesPageDescription } from '~/pages/pipelines/global/pipelines/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';

const GlobalPipelineRuns: React.FC = () => (
  <PipelineCoreApplicationPage
    title={pipelineRunsPageTitle}
    description={pipelinesPageDescription}
    getRedirectPath={(namespace) => `/pipelineRuns/${namespace}`}
  >
    <EmptyState>
      <Title headingLevel="h4" size="lg">
        Coming Soon
      </Title>
    </EmptyState>
  </PipelineCoreApplicationPage>
);

export default GlobalPipelineRuns;
