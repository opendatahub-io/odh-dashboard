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
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { routePipelinesNamespace } from '~/routes';

const GlobalPipelines: React.FC = () => {
  const pipelinesAPi = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={pipelinesPageTitle}
      description={pipelinesPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPi.pipelinesServer.installed} />}
      getRedirectPath={routePipelinesNamespace}
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <PipelineAndVersionContextProvider>
            <PipelinesView />
          </PipelineAndVersionContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalPipelines;
