import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
import PipelinesPageHeaderActions from '~/pages/pipelines/global/pipelines/PipelinesPageHeaderActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import PipelinesView from '~/pages/pipelines/global/pipelines/PipelinesView';

const GlobalPipelines: React.FC = () => {
  const pipelinesAPi = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={pipelinesPageTitle}
      description={pipelinesPageDescription}
      headerAction={pipelinesAPi.pipelinesServer.installed && <PipelinesPageHeaderActions />}
      getRedirectPath={(namespace) => `/pipelines/${namespace}`}
    >
      <PipelinesView />
    </PipelineCoreApplicationPage>
  );
};

export default GlobalPipelines;
