import React from 'react';
import {
  Layout,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  TopologyView,
  TopologyControlBar,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  action,
  GRAPH_LAYOUT_END_EVENT,
} from '@patternfly/react-topology';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { treeComponentFactory } from './treeFactories';
import { transformPipelineData, createMockPipelineData } from './transformPipelineData';
import type { PipelineVisualizationData } from './types';

const TREE_LAYOUT = 'TreeLayout';

class NoopLayout implements Layout {
  layout(): void {
    // No automatic layout - we use fixed positions
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
};

const TreeTopology: React.FC<TreeTopologyProps> = ({ className, data }) => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  // Use provided data or fall back to mock data
  const pipelineData = data ?? createMockPipelineData();
  const { nodes, edges } = React.useMemo(() => transformPipelineData(pipelineData), [pipelineData]);

  React.useEffect(() => {
    const viz = new Visualization();
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

    const onLayoutEnd = () => {
      requestAnimationFrame(() => {
        viz.getGraph().fit(80);
      });
    };
    viz.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);

    setController(viz);

    return () => {
      viz.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, []);

  // Update visualization when data changes
  React.useEffect(() => {
    if (controller) {
      controller.fromModel({ nodes, edges }, true);
      requestAnimationFrame(() => {
        controller.getGraph().fit(80);
      });
    }
  }, [controller, nodes, edges]);

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
        <TopologyView
          controlBar={
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
                  controller.getGraph().fit(80);
                }),
                resetViewCallback: action(() => {
                  controller.getGraph().reset();
                }),
                legend: false,
              })}
            />
          }
        >
          <VisualizationSurface />
        </TopologyView>
      </VisualizationProvider>
    </div>
  );
};

export default TreeTopology;
