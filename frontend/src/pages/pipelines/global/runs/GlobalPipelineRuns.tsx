import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { pipelineRunsBaseRoute } from '~/routes/pipelines/runs';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import {
  experimentRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import GlobalPipelineRunsTabs from '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import PipelineRunExperimentsContextProvider from '~/pages/pipelines/global/runs/PipelineRunExperimentsContext';

type GlobalPipelineRunsProps = {
  tab: PipelineRunType;
};

const GlobalPipelineRuns: React.FC<GlobalPipelineRunsProps> = ({ tab }) => {
  const pipelinesAPI = usePipelinesAPI();
  const { namespace } = pipelinesAPI;

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon title={pipelineRunsPageTitle} objectType={ProjectObjectType.pipelineRun} />
      }
      description={experimentRunsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={pipelineRunsBaseRoute}
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <PipelineRunExperimentsContextProvider>
            <PipelineRunVersionsContextProvider>
              <GlobalPipelineRunsTabs basePath={pipelineRunsBaseRoute(namespace)} tab={tab} />
            </PipelineRunVersionsContextProvider>
          </PipelineRunExperimentsContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalPipelineRuns;
