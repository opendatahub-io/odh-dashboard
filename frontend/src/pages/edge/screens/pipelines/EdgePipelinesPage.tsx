import React from 'react';
import { EdgeContext } from '~/concepts/edge/content/EdgeContext';
import { EdgePipelineTable } from '~/concepts/edge/content/pipelines/table/EdgePipelineTable';
import ApplicationsPage from '~/pages/ApplicationsPage';
import EmptyEdgePipelines from '~/concepts/edge/content/pipelines/table/EmptyEdgePipelines';

const EdgePipelinesPage = () => {
  const { models, pipelines, refreshAll } = React.useContext(EdgeContext);

  return (
    <ApplicationsPage
      title="ML Ops Pipelines"
      loaded={models.loaded && pipelines.loaded}
      empty={models.data.length === 0}
      emptyStatePage={<EmptyEdgePipelines />}
    >
      <EdgePipelineTable
        models={models.data}
        pipelines={pipelines.data}
        refreshAllData={refreshAll}
      />
    </ApplicationsPage>
  );
};

export default EdgePipelinesPage;
