import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage loaded empty={false} title="MLflow Experiments">
      <iframe
        // TODO: Replace with the actual MLflow URL when the fork deployment is ready
        src="/mlflow"
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
