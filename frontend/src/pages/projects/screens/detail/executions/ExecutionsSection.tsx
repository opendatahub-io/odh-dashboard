import * as React from 'react';
import { ButtonVariant, PageSection } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { MlmdListContextProvider, usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectObjectType } from '~/concepts/design/utils';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import ExecutionsList from '~/pages/pipelines/global/experiments/executions/ExecutionsList';
import { executionsPageDescription } from '~/pages/pipelines/global/experiments/executions/const';

const ExecutionsSection: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();
  const {
    apiAvailable,
    pipelinesServer: { initializing, installed, timedOut, compatible },
  } = pipelinesAPI;

  return (
    <PipelineAndVersionContextProvider>
      <DetailsSection
        id={ProjectSectionID.EXECUTIONS}
        objectType={ProjectObjectType.pipelineExecution}
        title={ProjectSectionTitles[ProjectSectionID.EXECUTIONS]}
        description={executionsPageDescription}
        data-testid={ProjectSectionID.EXECUTIONS}
        actions={[
          <PipelineServerActions
            key="server-actions"
            isDisabled={!pipelinesAPI.pipelinesServer.installed}
          />,
        ]}
        isLoading={(!timedOut && compatible && !apiAvailable && installed) || initializing}
        isEmpty={!installed}
        emptyState={<NoPipelineServer variant={ButtonVariant.primary} />}
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
      </DetailsSection>
    </PipelineAndVersionContextProvider>
  );
};

export default ExecutionsSection;
