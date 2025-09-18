import React, { useMemo } from 'react';
import {
  VisualizationProvider,
  VisualizationSurface,
  TopologyView,
  TopologyControlBar,
} from '@patternfly/react-topology';
import { EmptyState, EmptyStateVariant, Spinner, Alert, Title } from '@patternfly/react-core';
import {
  LineageProps,
  convertToLineageNodeModel,
  convertToLineageEdgeModel,
  TopologyEdgeModel,
} from './types';
import useLineageController from './useLineageController';
import { useLineageSelection } from './useLineageSelection';
import { useLineagePopover } from './useLineagePopover';
import { createLineageTopologyControls } from './topologyControls';
import { LineageClickProvider } from './LineageClickContext';

const LineageInner: React.FC<LineageProps> = ({
  data,
  height = '600px',
  loading = false,
  error,
  onNodeSelect,
  className,
  showNodePopover = true,
  componentFactory,
  popoverComponent: PopoverComponent,
  toolbarComponent: ToolbarComponent,
}) => {
  const controller = useLineageController('lineage-graph', componentFactory);

  // Convert generic lineage data to topology format
  const nodes = useMemo(() => {
    return data.nodes.map(convertToLineageNodeModel);
  }, [data.nodes]);

  const edges = useMemo((): TopologyEdgeModel[] => {
    return data.edges.map(convertToLineageEdgeModel);
  }, [data.edges]);

  // Initialize popover hook
  const {
    selectedNode: popoverNode,
    popoverPosition,
    isPopoverVisible,
    showPopover,
    hidePopover,
  } = useLineagePopover({
    data,
    enabled: showNodePopover && !!PopoverComponent,
  });

  // Enhanced node selection handler that also shows popover
  const handleNodeSelect = React.useCallback(
    (nodeId: string | null) => {
      onNodeSelect?.(nodeId);

      // Show popover for selected node if enabled
      if (nodeId && showNodePopover && PopoverComponent) {
        showPopover(nodeId);
      }
    },
    [onNodeSelect, showNodePopover, PopoverComponent, showPopover],
  );

  // Use selection management hook
  const { selectedIds, highlightedIds } = useLineageSelection({
    controller,
    edges,
    onNodeSelect: handleNodeSelect,
  });

  // Track timeout to prevent multiple simultaneous resets
  const layoutTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

        // Clear any existing timeout
        if (layoutTimeoutRef.current) {
          clearTimeout(layoutTimeoutRef.current);
        }

        // Reset and center the layout after data load, handles both initial load and data changes
        layoutTimeoutRef.current = setTimeout(() => {
          try {
            controller.getGraph().reset();
            controller.getGraph().layout();
          } catch (e) {
            console.warn('Failed to reset graph layout:', e);
          } finally {
            layoutTimeoutRef.current = null;
          }
        }, 100);

        return () => {
          if (layoutTimeoutRef.current) {
            clearTimeout(layoutTimeoutRef.current);
            layoutTimeoutRef.current = null;
          }
        };
      } catch (e) {
        console.error('Error loading lineage nodes and edges:', e);
        return undefined;
      }
    }
    return undefined;
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
    <div
      className={className}
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pf-t--color--gray--10)',
        borderRadius: 16,
      }}
    >
      {ToolbarComponent && <ToolbarComponent />}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', borderRadius: 16 }}>
        <TopologyView
          controlBar={
            <TopologyControlBar controlButtons={createLineageTopologyControls(controller)} />
          }
        >
          <VisualizationProvider controller={controller}>
            <VisualizationSurface state={{ selectedIds, highlightedIds }} />
          </VisualizationProvider>
        </TopologyView>

        {PopoverComponent && (
          <PopoverComponent
            node={popoverNode}
            position={popoverPosition}
            isVisible={isPopoverVisible}
            onClose={hidePopover}
          />
        )}
      </div>
    </div>
  );
};

export const Lineage: React.FC<LineageProps> = (props) => (
  <LineageClickProvider>
    <LineageInner {...props} />
  </LineageClickProvider>
);
