import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';
import MLflowExperimentsBreadcrumb from './breadcrumb/MLflowExperimentsBreadcrumb.tsx';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage
      loaded
      empty={false}
      title="MLflow Experiments"
      breadcrumb={<MLflowExperimentsBreadcrumb />}
    >
      <MLflowIframeCSSOverride>
        {(iframeRef) => <MlflowIframe ref={iframeRef} />}
      </MLflowIframeCSSOverride>
    </ApplicationsPage>
  );
};

export default GlobalMLflowExperimentsPage;
