import * as React from 'react';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import PipelinesTable from '~/concepts/pipelines/content/PipelinesTable';

const PipelinesList: React.FC = () => {
  const pipelines: PipelineKF[] = [];

  if (pipelines.length === 0) {
    return (
      <EmptyDetailsList title="No pipelines" description="To get started, import a pipeline." />
    );
  }

  return <PipelinesTable pipelines={pipelines} />;
};

export default PipelinesList;
