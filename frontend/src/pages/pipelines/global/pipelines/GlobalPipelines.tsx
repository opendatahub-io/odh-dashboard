import * as React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '#~/pages/pipelines/global/pipelines/const';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';
import PipelinesView from '#~/pages/pipelines/global/pipelines/PipelinesView';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { pipelinesBaseRoute } from '#~/routes/pipelines/global';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';

const GlobalPipelines: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={<TitleWithIcon title={pipelinesPageTitle} objectType={ProjectObjectType.pipeline} />}
      description={pipelinesPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={pipelinesBaseRoute}
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
