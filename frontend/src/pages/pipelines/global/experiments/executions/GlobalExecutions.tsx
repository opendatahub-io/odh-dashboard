import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { MlmdListContextProvider, usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { executionsBaseRoute } from '#~/routes/pipelines/executions';
import {
  executionsPageDescription,
  executionsPageTitle,
} from '#~/pages/pipelines/global/experiments/executions/const';
import ExecutionsList from '#~/pages/pipelines/global/experiments/executions/ExecutionsList';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

const GlobalExecutions: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon
          title={executionsPageTitle}
          objectType={ProjectObjectType.pipelineExecution}
        />
      }
      description={executionsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={executionsBaseRoute}
      overrideChildPadding
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <MlmdListContextProvider>
            <PageSection hasBodyWrapper={false} isFilled>
              <ExecutionsList />
            </PageSection>
          </MlmdListContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalExecutions;
