import React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyModelServing from './EmptyModelServing';

const ModelServingGlobal: React.FC = () => {
  return (
    <ApplicationsPage
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loaded
      empty
      emptyStatePage={<EmptyModelServing />}
    />
  );
};

export default ModelServingGlobal;
