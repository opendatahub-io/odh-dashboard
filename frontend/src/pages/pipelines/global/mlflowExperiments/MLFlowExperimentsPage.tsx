import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage loaded empty={false} title="MLflow Experiments">
      <iframe
        src="/mlflow/#/experiments"
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
