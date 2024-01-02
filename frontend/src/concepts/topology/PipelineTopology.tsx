import React from 'react';
import {
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import useTopologyController from './useTopologyController';
import PipelineVisualizationSurface from './PipelineVisualizationSurface';

type PipelineTopologyProps = {
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
  nodes: PipelineNodeModel[];
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
}) => {
  const controller = useTopologyController('g1');

  React.useEffect(() => {
    if (controller && onSelectionChange) {
      const onSelect = (ids: string[]) => {
        onSelectionChange(ids);
      };
      controller.addEventListener(SELECTION_EVENT, onSelect);

      return () => {
        controller?.removeEventListener(SELECTION_EVENT, onSelect);
      };
    }

    return;
  }, [controller, onSelectionChange]);

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <VisualizationProvider controller={controller}>
      <PipelineVisualizationSurface nodes={nodes} selectedIds={selectedIds} />
    </VisualizationProvider>
  );
};

export default PipelineTopology;
