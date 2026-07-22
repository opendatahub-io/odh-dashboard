import React from 'react';
import cx from 'classnames';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  Layout,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  SELECTION_EVENT,
} from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import PipelinePreparingState from '~/app/components/run-results/PipelinePreparingState';
import type { PipelineTreeLoadingMode } from '~/app/components/run-results/pipelineStatusLabels';
import { treeComponentFactory } from './treeFactories';
import type { TreeTopologyData } from './types';
import './pulseAnimation.scss';

const TREE_LAYOUT = 'TreeLayout';
const TREE_GRAPH_ID = 'tree-graph';
const TREE_FIT_PADDING = 60;

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

const buildGraphModel = (graph: ReturnType<Visualization['getGraph']>) => {
  const position = graph.getPosition();
  return {
    id: TREE_GRAPH_ID,
    type: 'graph',
    x: position.x,
    y: position.y,
    scale: graph.getScale(),
    layout: TREE_LAYOUT,
  };
};

type TreeTopologyProps = {
  className?: string;
  topology: TreeTopologyData;
  loadingMode?: PipelineTreeLoadingMode;
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
};

const TreeTopology: React.FC<TreeTopologyProps> = ({
  className,
  topology,
  loadingMode,
  selectedIds,
  onSelectionChange,
}) => {
  const isLoading = loadingMode != null;
  const [controller, setController] = React.useState<Visualization | null>(null);

  const { nodes = [], edges = [] } = topology;
  const hasPulsingNode = React.useMemo(
    () => nodes.some((node) => node.data?.activeIconVariant === 'pulse'),
    [nodes],
  );
  const containerClassName = cx(className, {
    'automl-tree-topology-container--pulse-active': hasPulsingNode,
  });

  React.useEffect(() => {
    if (isLoading) {
      setController(null);
      return undefined;
    }

    const viz = new Visualization();
    viz.setRenderConstraint(false);
    viz.setFitToScreenOnLayout(true);
    viz.registerComponentFactory(treeComponentFactory);
    viz.registerLayoutFactory((): Layout => new NoopLayout());

    viz.fromModel(
      {
        graph: {
          id: TREE_GRAPH_ID,
          type: 'graph',
          x: 25,
          y: 25,
          layout: TREE_LAYOUT,
        },
      },
      false,
    );

    setController(viz);
    // Visualization has no destroy(); listener cleanup is in the SELECTION_EVENT effect,
    // and dropping the controller reference is enough for GC.
    return undefined;
  }, [isLoading]);

  const surfaceState = React.useMemo(
    () => ({ selectedIds: normalizeTopologySelection(selectedIds ?? []) }),
    [selectedIds],
  );

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
          graph: buildGraphModel(controller.getGraph()),
          nodes,
          edges,
        },
        false,
      );

      // Drop selections for node IDs that are no longer in the applied model.
      if (onSelectionChange && selectedIds?.length) {
        const nodeIds = new Set(nodes.map((node) => node.id));
        const nextSelectedIds = selectedIds.filter((id) => nodeIds.has(id));
        if (nextSelectedIds.length !== selectedIds.length) {
          onSelectionChange(nextSelectedIds);
        }
      }
    }
    // selectedIds / onSelectionChange intentionally omitted: only reconcile when the model changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [controller, nodes, edges, isLoading]);

  React.useEffect(() => {
    if (controller && !isLoading) {
      const frameId = requestAnimationFrame(() => {
        controller.getGraph().fit(TREE_FIT_PADDING);
        controller.setFitToScreenOnLayout(false);
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    }
    return undefined;
  }, [controller, isLoading]);

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
    <div className={containerClassName} data-testid="tree-topology">
      <VisualizationProvider controller={controller}>
        <TopologyView
          controlBar={
            <div data-testid="tree-topology-control-bar">
              <TopologyControlBar
                controlButtons={createTopologyControlButtons({
                  ...defaultControlButtonsOptions,
                  zoomInCallback: action(() => {
                    controller.getGraph().scaleBy(4 / 3);
                  }),
                  zoomOutCallback: action(() => {
                    controller.getGraph().scaleBy(0.75);
                  }),
                  fitToScreenCallback: action(() => {
                    controller.getGraph().fit(TREE_FIT_PADDING);
                  }),
                  resetViewCallback: action(() => {
                    // Tree uses fixed positions (NoopLayout), so reset alone leaves the graph
                    // at the origin. Fit again to restore a centred viewport.
                    controller.getGraph().reset();
                    controller.getGraph().fit(TREE_FIT_PADDING);
                  }),
                  legend: false,
                })}
              />
            </div>
          }
        >
          <VisualizationSurface state={surfaceState} />
        </TopologyView>
      </VisualizationProvider>
    </div>
  );
};

export default TreeTopology;
