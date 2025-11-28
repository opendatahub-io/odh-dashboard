import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage loaded empty={false} title="MLflow Experiments">
      <MLflowIframeCSSOverride>
        {(iframeRef) => <MlflowIframe ref={iframeRef} />}
      </MLflowIframeCSSOverride>
    </ApplicationsPage>
  );
};

export default GlobalMLflowExperimentsPage;
