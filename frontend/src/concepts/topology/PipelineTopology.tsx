import React from 'react';
import {
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { Bullseye, Spinner, Stack, StackItem } from '@patternfly/react-core';
import PipelineVersionError from '#~/concepts/pipelines/content/pipelinesDetails/PipelineVersionError';
import { PipelineTopologyLayer } from '#~/concepts/pipelines/topology/pipelineTaskTypes';
import PipelineTopologyEmpty from './PipelineTopologyEmpty';
import useTopologyController from './useTopologyController';
import PipelineVisualizationSurface from './PipelineVisualizationSurface';
import PipelineTopologyBreadcrumbs from './PipelineTopologyBreadcrumbs';

type PipelineTopologyProps = {
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
  nodes: PipelineNodeModel[];
  versionError?: Error;
  sidePanel?: React.ReactElement | null;
  layers?: PipelineTopologyLayer[];
  onLayerChange?: (layers: PipelineTopologyLayer[]) => void;
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
  versionError,
  sidePanel,
  layers,
  onLayerChange,
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

  const hasBreadcrumbs = layers && layers.length > 1 && onLayerChange;

  return (
    <Stack className="pf-v6-u-h-100">
      {hasBreadcrumbs ? (
        <StackItem className="pf-v6-u-px-md pf-v6-u-py-sm">
          <PipelineTopologyBreadcrumbs layers={layers} onLayerChange={onLayerChange} />
        </StackItem>
      ) : null}
      <StackItem isFilled>
        <VisualizationProvider controller={controller}>
          <PipelineVisualizationSurface
            nodes={nodes}
            selectedIds={selectedIds}
            sidePanel={sidePanel}
          />
        </VisualizationProvider>
      </StackItem>
    </Stack>
  );
};

export default PipelineTopology;
