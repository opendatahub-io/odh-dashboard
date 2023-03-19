import * as React from 'react';
import GlobalNoPipelines from '~/pages/pipelines/global/pipelines/GlobalNoPipelines';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import PipelinesTable from '~/concepts/pipelines/content/PipelinesTable';

const PipelinesView: React.FC = () => {
  const pipelines: PipelineKF[] = [];

  if (pipelines.length === 0) {
    return <GlobalNoPipelines />;
  }

  return <PipelinesTable pipelines={pipelines} />;
};

export default PipelinesView;
