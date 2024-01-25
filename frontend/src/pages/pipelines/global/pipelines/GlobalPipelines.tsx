import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import PipelinesView from '~/pages/pipelines/global/pipelines/PipelinesView';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';

const GlobalPipelines: React.FC = () => {
  const pipelinesAPi = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={pipelinesPageTitle}
      description={pipelinesPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPi.pipelinesServer.installed} />}
      getRedirectPath={(namespace) => `/pipelines/${namespace}`}
      testId="pipelines-global-page"
    >
      <EnsureAPIAvailability>
        <PipelineAndVersionContextProvider>
          <PipelinesView />
        </PipelineAndVersionContextProvider>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalPipelines;
