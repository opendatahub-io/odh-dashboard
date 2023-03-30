import React from 'react';
import { PipelineNodeModel, VisualizationProvider } from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import useTopologyController from '~/concepts/pipelines/topology/useTopologyController';
import PipelineVisualizationSurface from '~/concepts/pipelines/topology/PipelineVisualizationSurface';

type PipelineTopologyProps = {
  nodes: PipelineNodeModel[];
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({ nodes }) => {
  const controller = useTopologyController('g1');

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <VisualizationProvider controller={controller}>
      <PipelineVisualizationSurface nodes={nodes} />
    </VisualizationProvider>
  );
};

export default PipelineTopology;
