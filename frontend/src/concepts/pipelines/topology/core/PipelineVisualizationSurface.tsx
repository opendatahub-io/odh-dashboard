import React from 'react';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  getEdgesFromNodes,
  PipelineNodeModel,
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  VisualizationSurface,
  getSpacerNodes,
} from '@patternfly/react-topology';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type PipelineVisualizationSurfaceProps = {
  nodes: PipelineNodeModel[];
  selectedIds?: string[];
};

const PipelineVisualizationSurface: React.FC<PipelineVisualizationSurfaceProps> = ({
  nodes,
  selectedIds,
}) => {
  const controller = useVisualizationController();
  const [error, setError] = React.useState<Error | null>();
  React.useEffect(() => {
    // PF Bug
    // TODO: Pipeline Topology weirdly doesn't set a width and height on spacer nodes -- but they do when using finally spacer nodes
    const spacerNodes = getSpacerNodes(nodes).map((s) => ({ ...s, width: 1, height: 1 }));
    const renderNodes = [...spacerNodes, ...nodes];
    // TODO: We can have a weird edge issue if the node is off by a few pixels vertically from the center
    const edges = getEdgesFromNodes(renderNodes);
    try {
      controller.fromModel(
        {
          nodes: renderNodes,
          edges,
        },
        true,
      );
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      } else {
        // eslint-disable-next-line no-console
        console.error('Unknown error occurred rendering Pipeline Graph', error);
      }
    }
  }, [controller, nodes]);
  if (error) {
    return (
      <EmptyState data-id="error-empty-state">
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h4" size="lg">
          Incorrect pipeline definition
        </Title>
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
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
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
