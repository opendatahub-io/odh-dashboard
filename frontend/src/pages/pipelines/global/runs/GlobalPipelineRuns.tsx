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
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import GlobalPipelineRunsTabs from './GlobalPipelineRunsTabs';

type GlobalPipelineRunsProps = Partial<
  Pick<
    React.ComponentProps<typeof PipelineCoreApplicationPage>,
    'breadcrumb' | 'description' | 'getRedirectPath'
  >
>;

const GlobalPipelineRuns: React.FC<GlobalPipelineRunsProps> = ({
  breadcrumb,
  description = pipelineRunsPageDescription,
  getRedirectPath = routePipelineRunsNamespace,
}) => (
  <PipelineCoreApplicationPage
    title={
      <TitleWithIcon title={pipelineRunsPageTitle} objectType={ProjectObjectType.pipelineRun} />
    }
    description={description}
    getRedirectPath={getRedirectPath}
    overrideChildPadding
    breadcrumb={breadcrumb}
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
