import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { MlmdListContextProvider, usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { executionsBaseRoute } from '~/routes';
import {
  executionsPageDescription,
  executionsPageTitle,
} from '~/pages/pipelines/global/experiments/executions/const';
import ExecutionsList from '~/pages/pipelines/global/experiments/executions/ExecutionsList';

const GlobalExecutions: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={executionsPageTitle}
      description={executionsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={executionsBaseRoute}
      overrideChildPadding
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <MlmdListContextProvider>
            <PageSection isFilled variant="light">
              <ExecutionsList />
            </PageSection>
          </MlmdListContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalExecutions;
