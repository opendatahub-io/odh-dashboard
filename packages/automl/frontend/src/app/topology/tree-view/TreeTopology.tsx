import React from 'react';
import {
  Layout,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  SELECTION_EVENT,
} from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import PipelinePreparingState from '~/app/components/run-results/PipelinePreparingState';
import type { PipelineTreeLoadingMode } from '~/app/components/run-results/pipelineStatusLabels';
import { treeComponentFactory } from './treeFactories';
import { transformPipelineData } from './transformPipelineData';
import type { PipelineVisualizationData } from './types';

const TREE_LAYOUT = 'TreeLayout';
const TREE_GRAPH_ID = 'tree-graph';

const normalizeTopologySelection = (ids: string[]): string[] =>
  ids.filter((id) => id !== TREE_GRAPH_ID);

class NoopLayout implements Layout {
  layout(): void {
    // Fixed positions — no automatic layout
  }
  stop(): void {
    // Nothing to stop
  }
  destroy(): void {
    // Nothing to destroy
  }
}

type TreeTopologyProps = {
  className?: string;
  data?: PipelineVisualizationData;
  loadingMode?: PipelineTreeLoadingMode;
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
};

const TreeTopology: React.FC<TreeTopologyProps> = ({
  className,
  data,
  loadingMode,
  selectedIds,
  onSelectionChange,
}) => {
  const isLoading = loadingMode != null;
  const [controller, setController] = React.useState<Visualization | null>(null);

  const { nodes, edges } = React.useMemo(
    () => (data ? transformPipelineData(data) : { nodes: [], edges: [] }),
    [data],
  );

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    const viz = new Visualization();
    viz.setRenderConstraint(false);
    viz.setFitToScreenOnLayout(true);
    viz.registerComponentFactory(treeComponentFactory);
    viz.registerLayoutFactory((): Layout => new NoopLayout());

    viz.fromModel(
      {
        graph: {
          id: 'tree-graph',
          type: 'graph',
          x: 25,
          y: 25,
          layout: TREE_LAYOUT,
        },
      },
      false,
    );

    setController(viz);
  }, [isLoading]);

  React.useEffect(() => {
    if (controller && onSelectionChange) {
      const onSelect = (ids: string[]) => {
        onSelectionChange(normalizeTopologySelection(ids));
      };
      controller.addEventListener(SELECTION_EVENT, onSelect);
      return () => {
        controller.removeEventListener(SELECTION_EVENT, onSelect);
      };
    }
    return undefined;
  }, [controller, onSelectionChange]);

  React.useEffect(() => {
    if (controller && !isLoading) {
      controller.fromModel(
        {
          graph: {
            id: 'tree-graph',
            type: 'graph',
            x: 25,
            y: 25,
            layout: TREE_LAYOUT,
          },
          nodes,
          edges,
        },
        false,
      );
      requestAnimationFrame(() => {
        controller.getGraph().fit(60);
      });
    }
  }, [controller, nodes, edges, isLoading]);

  if (loadingMode) {
    return <PipelinePreparingState className={className} mode={loadingMode} />;
  }

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <div className={className} data-testid="tree-topology">
      <VisualizationProvider controller={controller}>
        <VisualizationSurface
          state={{ selectedIds: normalizeTopologySelection(selectedIds ?? []) }}
        />
      </VisualizationProvider>
    </div>
  );
};

export default TreeTopology;
