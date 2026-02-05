import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import {
  mlflowExperimentsBaseRoute,
  WORKSPACE_QUERY_PARAM,
} from '#~/routes/pipelines/mlflowExperiments';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { experimentsPageTitle } from '#~/pages/pipelines/global/experiments/const';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => (
  <ApplicationsPage
    loaded
    empty={false}
    title={
      <TitleWithIcon
        title={experimentsPageTitle}
        objectType={ProjectObjectType.pipelineExperiment}
      />
    }
    headerContent={
      <PipelineCoreProjectSelector
        getRedirectPath={mlflowExperimentsBaseRoute}
        queryParamNamespace={WORKSPACE_QUERY_PARAM}
      />
    }
  >
    <MLflowIframeCSSOverride>
      {(iframeRef) => <MlflowIframe ref={iframeRef} />}
    </MLflowIframeCSSOverride>
  </ApplicationsPage>
);

export default GlobalMLflowExperimentsPage;
