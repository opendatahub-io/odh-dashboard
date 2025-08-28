import React, { useMemo } from 'react';
import {
  VisualizationProvider,
  VisualizationSurface,
  TopologyView,
  TopologyControlBar,
} from '@patternfly/react-topology';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Alert,
  Title,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import useLineageController from './useLineageController';
import { useLineageSelection } from './useLineageSelection';
import { createLineageTopologyControls } from './topologyControls';
import {
  LineageProps,
  convertToLineageNodeModel,
  convertToLineageEdgeModel,
  TopologyEdgeModel,
} from './types';

export const Lineage: React.FC<LineageProps> = ({
  data,
  height = '600px',
  loading = false,
  error,
  emptyStateMessage = 'No lineage data available',
  onNodeSelect,
  className,
}) => {
  const controller = useLineageController('lineage-graph');

  // Convert generic lineage data to topology format
  const nodes = useMemo(() => {
    return data.nodes.map(convertToLineageNodeModel);
  }, [data.nodes]);

  const edges = useMemo((): TopologyEdgeModel[] => {
    return data.edges.map(convertToLineageEdgeModel);
  }, [data.edges]);

  // Use selection management hook
  const { selectedIds, highlightedIds } = useLineageSelection({
    controller,
    edges,
    onNodeSelect,
  });

  // Load nodes and edges into controller when it's ready
  React.useEffect(() => {
    if (controller && nodes.length > 0) {
      try {
        controller.fromModel(
          {
            nodes,
            edges,
          },
          true, // Update existing model
        );
      } catch (e) {
        console.error('Error loading lineage nodes and edges:', e);
      }
    }
  }, [controller, nodes, edges]);

  // Get the selected node for potential pan-into-view functionality
  const selectedNode = useMemo(() => {
    return selectedIds[0] && controller ? controller.getNodeById(selectedIds[0]) : null;
  }, [selectedIds, controller]);

  // Pan selected node into view like Pipeline DAG does
  React.useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null = null;
    if (selectedNode) {
      // Use a timeout to allow for any UI changes to settle
      resizeTimeout = setTimeout(() => {
        if (controller) {
          controller.getGraph().panIntoView(selectedNode, {
            offset: 20,
            minimumVisible: 100,
          });
        }
      }, 300);
    }
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [selectedNode, controller]);

  // Handle loading state
  if (loading) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <EmptyState variant={EmptyStateVariant.lg}>
          <Spinner size="lg" />
          <Title headingLevel="h4" size="lg">
            Loading lineage data...
          </Title>
        </EmptyState>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={className} style={{ height, padding: '1rem' }}>
        <Alert variant="danger" isInline title="Error loading lineage data">
          {error}
        </Alert>
      </div>
    );
  }

  // Handle empty state
  if (!data.nodes.length && !data.edges.length) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <EmptyState variant={EmptyStateVariant.lg}>
          <TopologyIcon />
          <Title headingLevel="h4" size="lg">
            {emptyStateMessage}
          </Title>
          <EmptyStateBody>
            Connect your data sources and feature views to see the lineage visualization.
          </EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  // Handle controller not ready
  if (!controller) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <EmptyState variant={EmptyStateVariant.lg}>
          <Spinner size="lg" />
          <Title headingLevel="h4" size="lg">
            Initializing visualization...
          </Title>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TopologyView
          controlBar={
            <TopologyControlBar controlButtons={createLineageTopologyControls(controller)} />
          }
        >
          <VisualizationProvider controller={controller}>
            <VisualizationSurface state={{ selectedIds, highlightedIds }} />
          </VisualizationProvider>
        </TopologyView>
      </div>
    </div>
  );
};
