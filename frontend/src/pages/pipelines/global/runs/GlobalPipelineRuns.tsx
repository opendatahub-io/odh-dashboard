import * as React from 'react';
import {
  pipelineRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { routePipelineRunsNamespace } from '~/routes';
import GlobalPipelineRunsTabs from './GlobalPipelineRunsTabs';

const GlobalPipelineRuns: React.FC = () => (
  <PipelineCoreApplicationPage
    title={pipelineRunsPageTitle}
    description={pipelineRunsPageDescription}
    getRedirectPath={routePipelineRunsNamespace}
    overrideChildPadding
  >
    <EnsureAPIAvailability>
      <EnsureCompatiblePipelineServer>
        <PipelineRunVersionsContextProvider>
          <GlobalPipelineRunsTabs />
        </PipelineRunVersionsContextProvider>
      </EnsureCompatiblePipelineServer>
    </EnsureAPIAvailability>
  </PipelineCoreApplicationPage>
);

export default GlobalPipelineRuns;
