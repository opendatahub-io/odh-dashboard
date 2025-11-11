import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return <ApplicationsPage loaded empty={false} title="MLflow Experiments"></ApplicationsPage>;
};

export default GlobalMLflowExperimentsPage;
