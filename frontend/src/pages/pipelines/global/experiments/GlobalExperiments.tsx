import * as React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { experimentsBaseRoute } from '#~/routes/pipelines/experiments';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ExperimentListTabs, experimentsPageDescription, experimentsPageTitle } from './const';
import GlobalExperimentsTabs from './GlobalExperimentsTabs';

type GlobalExperimentsParams = {
  tab: ExperimentListTabs;
};

const GlobalExperiments: React.FC<GlobalExperimentsParams> = ({ tab }) => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon
          title={experimentsPageTitle}
          objectType={ProjectObjectType.pipelineExperiment}
        />
      }
      description={experimentsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={experimentsBaseRoute}
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
