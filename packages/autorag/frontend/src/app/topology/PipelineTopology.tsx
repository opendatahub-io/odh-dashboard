import React from 'react';
import {
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { Bullseye, Spinner, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { computePipelineRankSep } from './const';
import useTopologyController from './useTopologyController';
import PipelineVisualizationSurface from './PipelineVisualizationSurface';

type PipelineTopologyProps = {
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
  nodes: PipelineNodeModel[];
  className?: string;
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
  className,
}) => {
  // Recompute only when `nodes` reference changes; downstream memos key on the signature string
  // so ranksep stays stable when a new array carries the same numeric widths.
  const nodeWidthSignature = React.useMemo(
    () => nodes.map((n) => (typeof n.width === 'number' ? n.width : 0)).join(','),
    [nodes],
  );

  const maxWidth = React.useMemo(() => {
    if (nodeWidthSignature.length === 0) {
      return 0;
    }
    return nodeWidthSignature
      .split(',')
      .map(Number)
      .reduce((max, w) => Math.max(max, w), 0);
  }, [nodeWidthSignature]);

  const horizontalRankSep = React.useMemo(() => computePipelineRankSep(maxWidth), [maxWidth]);

  const controller = useTopologyController('autorag-graph', horizontalRankSep);

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

  if (!nodes.length) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="No tasks to render"
        data-testid="topology"
      >
        <EmptyStateBody>This graph is not in a format we can render.</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <div className={className}>
      <VisualizationProvider controller={controller}>
        <PipelineVisualizationSurface nodes={nodes} selectedIds={selectedIds} />
      </VisualizationProvider>
    </div>
  );
};

export default PipelineTopology;
