import React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';

const ModelServingMetrics: React.FC = () => {
  return (
    <ApplicationsPage
      title="Model metrics"
      loaded // TODO: load when the context is ready
      provideChildrenPadding
      description={undefined}
      empty={false}
    >
      <p>No data</p>
    </ApplicationsPage>
  );
};

export default ModelServingMetrics;
