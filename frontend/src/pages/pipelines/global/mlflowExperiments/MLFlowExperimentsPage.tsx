import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { mlflowIframeUrl } from '#~/routes/pipelines/mlflowExperiments';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage loaded empty={false} title="MLflow Experiments">
      <iframe
        title="MLflow Experiments Interface"
        // TODO: Replace with the actual MLflow URL when the fork deployment is ready
        src={mlflowIframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      ></iframe>
    </ApplicationsPage>
  );
};

export default GlobalMLflowExperimentsPage;
