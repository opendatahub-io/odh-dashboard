import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import { mlflowExperimentsBaseRoute } from '#~/routes/pipelines/mlflowExperiments';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => (
  <ApplicationsPage
    loaded
    empty={false}
    title="MLflow Experiments"
    headerContent={<PipelineCoreProjectSelector getRedirectPath={mlflowExperimentsBaseRoute} />}
  >
    <MLflowIframeCSSOverride>
      {(iframeRef) => <MlflowIframe ref={iframeRef} />}
    </MLflowIframeCSSOverride>
  </ApplicationsPage>
);

export default GlobalMLflowExperimentsPage;
