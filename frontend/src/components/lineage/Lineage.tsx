import React, { useMemo } from 'react';
import {
  VisualizationProvider,
  VisualizationSurface,
  TopologyView,
  TopologyControlBar,
} from '@patternfly/react-topology';
import {
  EmptyState,
  EmptyStateVariant,
  Spinner,
  Alert,
  Title,
  Divider,
} from '@patternfly/react-core';
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
import { LineageClickProvider, useLineageClick } from './LineageClickContext';
import { useLineageCenter } from './context/LineageCenterContext';
import { useDebouncedCenter } from './useDebouncedCenter';

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
  autoResetOnDataChange = false,
}) => {
  const controller = useLineageController('lineage-graph', componentFactory);
  const { forceCenter } = useLineageCenter();
  const { debouncedCenter, cleanup } = useDebouncedCenter(controller);

  const nodes = useMemo(() => {
    return data.nodes.map(convertToLineageNodeModel);
  }, [data.nodes]);

  const edges = useMemo((): TopologyEdgeModel[] => {
    return data.edges.map(convertToLineageEdgeModel);
  }, [data.edges]);

  const { getLastClickPosition } = useLineageClick();

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

  const handleNodeSelect = React.useCallback(
    (nodeId: string | null) => {
      onNodeSelect?.(nodeId);

      if (nodeId && showNodePopover && PopoverComponent) {
        const isValidNode = data.nodes.some((node) => node.id === nodeId);

        if (isValidNode) {
          const clickPosition = getLastClickPosition();
          showPopover(
            nodeId,
            clickPosition ? { x: clickPosition.x, y: clickPosition.y } : undefined,
          );
        }
      }
    },
    [
      onNodeSelect,
      showNodePopover,
      PopoverComponent,
      showPopover,
      getLastClickPosition,
      data.nodes,
    ],
  );

  const { selectedIds, highlightedIds } = useLineageSelection({
    controller,
    edges,
    onNodeSelect: handleNodeSelect,
  });

  React.useEffect(() => {
    if (controller && nodes.length > 0) {
      try {
        controller.fromModel(
          {
            nodes,
            edges,
          },
          true,
        );
      } catch (e) {
        // Silently handle errors
      }
    }
  }, [controller, nodes, edges]);

  // Auto-reset zoom and center when data changes after filtering
  const prevNodesLengthRef = React.useRef(nodes.length);
  const prevEdgesLengthRef = React.useRef(edges.length);
  const innerTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const nodesLengthChanged = prevNodesLengthRef.current !== nodes.length;
    const edgesLengthChanged = prevEdgesLengthRef.current !== edges.length;

    if (
      controller &&
      autoResetOnDataChange &&
      nodes.length > 0 &&
      (nodesLengthChanged || edgesLengthChanged)
    ) {
      const resetTimeout = setTimeout(() => {
        try {
          controller.getGraph().reset();
          controller.getGraph().layout();

          // Clear any existing inner timeout
          if (innerTimeoutRef.current) {
            clearTimeout(innerTimeoutRef.current);
          }

          innerTimeoutRef.current = setTimeout(() => {
            debouncedCenter();
            innerTimeoutRef.current = null;
          }, 50);
        } catch (e) {
          // Silently handle errors
        }
      }, 100);

      // Update refs after triggering reset
      prevNodesLengthRef.current = nodes.length;
      prevEdgesLengthRef.current = edges.length;

      return () => {
        clearTimeout(resetTimeout);
        if (innerTimeoutRef.current) {
          clearTimeout(innerTimeoutRef.current);
          innerTimeoutRef.current = null;
        }
      };
    }

    prevNodesLengthRef.current = nodes.length;
    prevEdgesLengthRef.current = edges.length;

    return undefined;
  }, [controller, autoResetOnDataChange, nodes, edges, debouncedCenter]);

  React.useEffect(() => {
    if (!controller || !forceCenter) return;
    debouncedCenter();
  }, [controller, forceCenter, debouncedCenter]);

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

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
        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
        borderRadius: 16,
      }}
    >
      {ToolbarComponent && (
        <>
          <ToolbarComponent />
          <Divider />
        </>
      )}
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
