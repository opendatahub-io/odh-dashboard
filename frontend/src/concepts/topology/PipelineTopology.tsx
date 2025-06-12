import React from 'react';
import {
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import PipelineVersionError from '#~/concepts/pipelines/content/pipelinesDetails/PipelineVersionError';
import PipelineTopologyEmpty from './PipelineTopologyEmpty';
import useTopologyController from './useTopologyController';
import PipelineVisualizationSurface from './PipelineVisualizationSurface';

type PipelineTopologyProps = {
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
  nodes: PipelineNodeModel[];
  versionError?: Error;
  sidePanel?: React.ReactElement | null;
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
  versionError,
  sidePanel,
}) => {
  const controller = useTopologyController('g1');

  React.useEffect(() => {
    if (controller && onSelectionChange) {
      const onSelect = (ids: string[]) => {
        onSelectionChange(ids);
      };
      controller.addEventListener(SELECTION_EVENT, onSelect);

      return () => {
        controller.removeEventListener(SELECTION_EVENT, onSelect);
      };
    }

    return undefined;
  }, [controller, onSelectionChange]);

  if (versionError) {
    return (
      <PipelineVersionError
        title="Pipeline run graph unavailable"
        description="The pipeline version that this run graph belongs to has been deleted."
        testId="run-graph-error-state"
      />
    );
  }

  if (!nodes.length) {
    return <PipelineTopologyEmpty />;
  }

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <VisualizationProvider controller={controller}>
      <PipelineVisualizationSurface nodes={nodes} selectedIds={selectedIds} sidePanel={sidePanel} />
    </VisualizationProvider>
  );
};

export default PipelineTopology;
