import * as React from 'react';
import { pipelineRunsPageTitle } from '~/pages/pipelines/global/runs/const';
import { pipelinesPageDescription } from '~/pages/pipelines/global/pipelines/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import GlobalPipelineRunsTabs from './GlobalPipelineRunsTabs';

const GlobalPipelineRuns: React.FC = () => (
  <PipelineCoreApplicationPage
    title={pipelineRunsPageTitle}
    description={pipelinesPageDescription}
    getRedirectPath={(namespace) => `/pipelineRuns/${namespace}`}
    overrideChildPadding
  >
    <EnsureAPIAvailability>
      <GlobalPipelineRunsTabs />
    </EnsureAPIAvailability>
  </PipelineCoreApplicationPage>
);

export default GlobalPipelineRuns;
