import React, { useState, useMemo } from 'react';
import {
  ColaLayout,
  ComponentFactory,
  DefaultGroup,
  EdgeStyle,
  Graph,
  GraphComponent,
  Layout,
  LayoutFactory,
  ModelKind,
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
  VisualizationSurface,
  DagreLayout,
  action,
  TopologyView,
  TopologyControlBar,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import CurvedEdge from './CurvedEdge';
import LineageNode from './LineageNode';
import useLineageController from './useLineageController';
import {
  createLineageNode,
  createFeatureViewNode,
  createFeatureServiceNode,
  createDataSourceNode,
} from './utils';

export const baselineLayoutFactory: LayoutFactory = (
  type: string,
  graph: Graph,
): Layout | undefined => {
  switch (type) {
    case 'Dagre':
      return new DagreLayout(graph, {
        rankdir: 'LR', // Left to Right flow
        nodesep: 20, // Increased spacing between nodes in same rank
        ranksep: 50, // Increased spacing between ranks (layers)
        marginx: 5, // More margin to prevent edge overlap
        marginy: 5,
        edgesep: 10, // More spacing between edges
        ranker: 'network-simplex', // Better algorithm for minimizing edge crossings
      });
    case 'Cola':
      return new ColaLayout(graph);
    default:
      return new DagreLayout(graph, {
        rankdir: 'LR',
        nodesep: 20,
        ranksep: 50,
        marginx: 5,
        marginy: 5,
        edgesep: 10,
        ranker: 'network-simplex',
        layoutOnDrag: false,
      });
  }
};

export const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    case 'curved-edge':
      return withSelection()(CurvedEdge); // Enable selection and proper Bézier curves
    case 'lineage-node':
      return withSelection()(LineageNode); // Enable selection on lineage nodes
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(withSelection()(GraphComponent)); // Enable pan/zoom like Pipeline DAG
        case ModelKind.node:
          return withSelection()(LineageNode); // Use LineageNode as default for all nodes
        case ModelKind.edge:
          return withSelection()(CurvedEdge); // Use proper Bézier curves with selection
        default:
          return undefined;
      }
  }
};

// Let Dagre handle positioning automatically for cleaner edge routing
export const NODES: PipelineNodeModel[] = [
  // Layer 1: Entities (leftmost)
  createLineageNode('entity-zipcode', 'Entity: zipcode', 'entity'),
  createLineageNode('entity-dob-ssn', 'Entity: dob_ssn', 'entity'),
  createLineageNode('entity-user', 'Entity: user', 'entity'),

  // Layer 2: Data Sources
  createDataSourceNode('datasource-zipcode', 'Zipcode source'),
  createDataSourceNode('datasource-credit-history', 'Credit_history'),
  createLineageNode('request-source', 'RequestSource: application data', 'request_source'),

  // Layer 3: Feature Views
  createFeatureViewNode('fv-zipcode', 'zipcode_...', 'batch_feature_view', 6),
  createFeatureViewNode('fv-debt-history', 'debt_history', 'batch_feature_view', 3),
  createFeatureViewNode('fv-loan-amnt', 'loan_amnt', 'on_demand_feature_view'),
  createFeatureViewNode('fv-zipcode-lookup', 'Zl de', 'on_demand_feature_view', 1),
  createFeatureViewNode('fv-ebt-calc', 'ebt_calc', 'on_demand_feature_view', 1),

  // Layer 4: Feature Services (rightmost)
  createFeatureServiceNode('fs-1', 'servicename'),
  createFeatureServiceNode('fs-2', 'servicename'),
];

export const EDGES = [
  // Entity to Data Source connections
  {
    id: 'edge-entity-zipcode-to-datasource',
    type: 'curved-edge',
    source: 'entity-zipcode',
    target: 'datasource-zipcode',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-entity-dob-ssn-to-datasource',
    type: 'curved-edge',
    source: 'entity-dob-ssn',
    target: 'datasource-credit-history',
    edgeStyle: EdgeStyle.default,
  },

  // Data Source to Feature View connections
  {
    id: 'edge-datasource-zipcode-to-fv',
    type: 'curved-edge',
    source: 'datasource-zipcode',
    target: 'fv-zipcode',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-datasource-credit-to-fv',
    type: 'curved-edge',
    source: 'datasource-credit-history',
    target: 'fv-debt-history',
    edgeStyle: EdgeStyle.default,
  },

  // Request Source to On-demand Feature Views
  {
    id: 'edge-request-to-loan-amnt',
    type: 'curved-edge',
    source: 'request-source',
    target: 'fv-loan-amnt',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-request-to-zipcode-lookup',
    type: 'curved-edge',
    source: 'request-source',
    target: 'fv-zipcode-lookup',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-request-to-ebt-calc',
    type: 'curved-edge',
    source: 'request-source',
    target: 'fv-ebt-calc',
    edgeStyle: EdgeStyle.default,
  },

  // Feature Views to Feature Services
  {
    id: 'edge-fv-zipcode-to-fs1',
    type: 'curved-edge',
    source: 'fv-zipcode',
    target: 'fs-1',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-fv-zipcode-lookup-to-fs1',
    type: 'curved-edge',
    source: 'fv-zipcode-lookup',
    target: 'fs-1',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-fv-ebt-calc-to-fs2',
    type: 'curved-edge',
    source: 'fv-ebt-calc',
    target: 'fs-2',
    edgeStyle: EdgeStyle.default,
  },
];

export const Lineage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const controller = useLineageController('g1');

  // Function to find all connected nodes and edges for highlighting
  const findConnectedElements = (nodeId: string): string[] => {
    if (!nodeId) return [];

    const connectedIds: string[] = [];
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();

    // Recursive function to traverse all downstream nodes
    const traverseDownstream = (currentNodeId: string) => {
      if (visitedNodes.has(currentNodeId)) return;

      visitedNodes.add(currentNodeId);
      connectedIds.push(currentNodeId);

      // Find all outgoing edges from current node
      const outgoingEdges = EDGES.filter((edge) => edge.source === currentNodeId);

      outgoingEdges.forEach((edge) => {
        if (!visitedEdges.has(edge.id)) {
          visitedEdges.add(edge.id);
          connectedIds.push(edge.id);
          // Recursively traverse to target node
          traverseDownstream(edge.target);
        }
      });
    };

    // Recursive function to traverse all upstream nodes
    const traverseUpstream = (currentNodeId: string) => {
      if (visitedNodes.has(currentNodeId)) return;

      visitedNodes.add(currentNodeId);
      connectedIds.push(currentNodeId);

      // Find all incoming edges to current node
      const incomingEdges = EDGES.filter((edge) => edge.target === currentNodeId);

      incomingEdges.forEach((edge) => {
        if (!visitedEdges.has(edge.id)) {
          visitedEdges.add(edge.id);
          connectedIds.push(edge.id);
          // Recursively traverse to source node
          traverseUpstream(edge.source);
        }
      });
    };

    // Start with the selected node
    visitedNodes.add(nodeId);
    connectedIds.push(nodeId);

    // Traverse all upstream connections (complete lineage back to sources)
    const upstreamEdges = EDGES.filter((edge) => edge.target === nodeId);
    upstreamEdges.forEach((edge) => {
      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        connectedIds.push(edge.id);
        traverseUpstream(edge.source);
      }
    });

    // Traverse all downstream connections (complete lineage forward to destinations)
    const downstreamEdges = EDGES.filter((edge) => edge.source === nodeId);
    downstreamEdges.forEach((edge) => {
      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        connectedIds.push(edge.id);
        traverseDownstream(edge.target);
      }
    });

    return connectedIds;
  };

  // Custom selection handler to highlight connections
  const handleSelection = React.useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);

      // If a node is selected, highlight its connections
      if (ids.length > 0) {
        const selectedId = ids[0];
        const connectedElements = findConnectedElements(selectedId);
        setHighlightedIds(connectedElements);
      } else {
        // Clear highlighting when nothing is selected
        setHighlightedIds([]);
      }
    },
    [findConnectedElements],
  );

  React.useEffect(() => {
    if (controller) {
      controller.addEventListener(SELECTION_EVENT, handleSelection);

      return () => {
        controller.removeEventListener(SELECTION_EVENT, handleSelection);
      };
    }

    return undefined;
  }, [controller, handleSelection]);

  // Load nodes and edges into controller when it's ready (like PipelineVisualizationSurface does)
  React.useEffect(() => {
    if (controller) {
      try {
        controller.fromModel(
          {
            nodes: NODES,
            edges: EDGES,
          },
          true, // Update existing model
        );
      } catch (e) {
        console.error('Error loading lineage nodes and edges:', e);
      }
    }
  }, [controller]);

  // Update controller state when highlightedIds changes
  React.useEffect(() => {
    if (controller) {
      controller.setState({ highlightedIds });
    }
  }, [controller, highlightedIds]);

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

  if (!controller) {
    return null; // or loading spinner
  }

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInTip: 'Zoom in to see more detail',
            zoomOutTip: 'Zoom out for better overview',
            fitToScreenTip: 'Fit entire lineage graph to screen',
            resetViewTip: 'Reset zoom and center the graph',
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
      <VisualizationProvider controller={controller}>
        <VisualizationSurface state={{ selectedIds, highlightedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};
