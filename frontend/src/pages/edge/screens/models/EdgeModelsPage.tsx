import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { EdgeContext } from '~/concepts/edge/content/EdgeContext';
import { EdgeModelsTable } from '~/concepts/edge/content/models/table/EdgeModelsTable';

const EdgeModelsPage: React.FC = () => {
  const { models, pipelines, refreshAll } = React.useContext(EdgeContext);
  return (
    <ApplicationsPage title="Models" loaded={models.loaded} empty={false}>
      <EdgeModelsTable
        models={models.data}
        pipelines={pipelines.data}
        refreshAllData={refreshAll}
      />
    </ApplicationsPage>
  );
};

export default EdgeModelsPage;
