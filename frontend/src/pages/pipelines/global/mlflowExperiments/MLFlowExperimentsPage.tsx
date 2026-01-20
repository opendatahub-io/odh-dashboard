import React, { useRef } from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';
import MLflowExperimentsBreadcrumb from './breadcrumb/MLflowExperimentsBreadcrumb';
import { useMlflowFetchInterceptor } from './context/useMlflowFetchInterceptor';

const GlobalMLflowExperimentsPage: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useMlflowFetchInterceptor(iframeRef);
  return (
    <ApplicationsPage
      loaded
      empty={false}
      title="MLflow Experiments"
      breadcrumb={<MLflowExperimentsBreadcrumb />}
    >
      <MLflowIframeCSSOverride iframeRef={iframeRef}>
        <MlflowIframe ref={iframeRef} />
      </MLflowIframeCSSOverride>
    </ApplicationsPage>
  );
};

export default GlobalMLflowExperimentsPage;
