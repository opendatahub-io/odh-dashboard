import React from 'react';
import { EdgeContext } from '~/concepts/edge/content/EdgeContext';
import { EdgePipelineTable } from '~/concepts/edge/content/edgePipelines/EdgePipelineTable';
import ApplicationsPage from '~/pages/ApplicationsPage';
import EmptyEdgeModels from '~/pages/edge/EmptyEdgeModels';

const EdgePipelinesPage = () => {
  const { models, pipelines } = React.useContext(EdgeContext);

  return (
    <ApplicationsPage
      title="ML Ops Pipelines"
      loaded={models.loaded && pipelines.loaded}
      empty={models.data.length === 0}
      emptyStatePage={<EmptyEdgeModels />}
    >
      <EdgePipelineTable models={models.data} pipelines={pipelines.data} />
    </ApplicationsPage>
  );
};

export default EdgePipelinesPage;
