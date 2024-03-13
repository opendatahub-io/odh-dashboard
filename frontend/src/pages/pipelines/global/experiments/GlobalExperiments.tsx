import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { ExperimentListTabs, experimentsPageDescription, experimentsPageTitle } from './const';
import GlobalExperimentsTabs from './GlobalExperimentsTabs';

type GlobalExperimentsParams = {
  tab: ExperimentListTabs;
};

const GlobalExperiments: React.FC<GlobalExperimentsParams> = ({ tab }) => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={experimentsPageTitle}
      description={experimentsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={(namespace) => `/pipelineExperiments/${namespace}`}
      overrideChildPadding
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <PipelineAndVersionContextProvider>
            <GlobalExperimentsTabs tab={tab} />
          </PipelineAndVersionContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalExperiments;
