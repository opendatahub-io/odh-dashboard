import { SelectionOptions } from '@odh-dashboard/internal/components/MultiSelection';
import {
  LineageData,
  convertToLineageEdgeModel,
} from '@odh-dashboard/internal/components/lineage/types';
import { findConnectedElements } from '@odh-dashboard/internal/components/lineage/graphUtils';
import { FeatureStoreLineage, FeatureViewLineage } from '../../types/lineage';
import { FeatureStoreLineageSearchFilters } from '../../types/toolbarTypes';

export const extractFilterOptionsFromLineage = (
  lineageData: FeatureStoreLineage | FeatureViewLineage,
): Record<string, SelectionOptions[]> => {
  // Type guard to ensure we have FeatureStoreLineage
  if (!('objects' in lineageData)) {
    return {
      entity: [],
      featureView: [],
      dataSource: [],
      featureService: [],
    };
  }
  return {
    entity: lineageData.objects.entities
      .filter((entity) => entity.spec.name) // Filter out entities with undefined names
      .map((entity) => ({
        id: `${lineageData.project || 'default'}-entity-${entity.spec.name}`,
        name: entity.spec.name,
        description: entity.spec.description,
      })),
    featureView: lineageData.objects.featureViews
      .map((featureView) => {
        let name = '';
        let description = '';

        if ('featureView' in featureView) {
          name = featureView.featureView.spec.name || '';
          description = featureView.featureView.spec.description || '';
        } else if ('onDemandFeatureView' in featureView) {
          name = featureView.onDemandFeatureView.spec.name || '';
          description = featureView.onDemandFeatureView.spec.description || '';
        } else if ('streamFeatureView' in featureView) {
          name = featureView.streamFeatureView.spec.name || '';
          description = featureView.streamFeatureView.spec.description || '';
        }

        return {
          id: `${lineageData.project || 'default'}-featureview-${name}`,
          name,
          description,
        };
      })
      .filter((option) => option.name), // Filter out options with empty names
    dataSource: lineageData.objects.dataSources
      .filter((dataSource) => dataSource.name) // Filter out data sources with undefined names
      .map((dataSource) => ({
        id: `${lineageData.project || 'default'}-datasource-${dataSource.name}`,
        name: dataSource.name,
        description: dataSource.description,
      })),
    featureService: lineageData.objects.featureServices
      .filter((featureService) => featureService.spec.name) // Filter out feature services with undefined names
      .map((featureService) => ({
        id: `${lineageData.project || 'default'}-featureservice-${featureService.spec.name}`,
        name: featureService.spec.name,
        description: featureService.spec.description,
      })),
  };
};

export const extractFilterOptionsFromFeatureViewLineage = (
  featureViewLineage: FeatureViewLineage | FeatureStoreLineage,
  project = 'default',
): Record<string, SelectionOptions[]> => {
  // Type guard to ensure we have FeatureViewLineage
  if ('objects' in featureViewLineage) {
    return {
      entity: [],
      featureView: [],
      dataSource: [],
      featureService: [],
    };
  }

  const uniqueObjects = new Map<string, { type: string; name: string }>();

  featureViewLineage.relationships.forEach((relationship) => {
    const sourceKey = `${relationship.source.type}-${relationship.source.name}`;
    const targetKey = `${relationship.target.type}-${relationship.target.name}`;

    uniqueObjects.set(sourceKey, relationship.source);
    uniqueObjects.set(targetKey, relationship.target);
  });

  const filterOptions: Record<string, SelectionOptions[]> = {
    entity: [],
    featureView: [],
    dataSource: [],
    featureService: [],
  };

  uniqueObjects.forEach((obj) => {
    // Skip objects with undefined names
    if (!obj.name) {
      return;
    }

    const option = {
      id: `${project}-${obj.type.toLowerCase()}-${obj.name}`,
      name: obj.name,
      description: '', // Note: relationships don't include descriptions
    };

    switch (obj.type) {
      case 'entity':
        filterOptions.entity.push(option);
        break;
      case 'featureView':
      case 'onDemandFeatureView':
      case 'streamFeatureView':
        filterOptions.featureView.push(option);
        break;
      case 'dataSource':
      case 'batchDataSource':
      case 'pushDataSource':
      case 'requestDataSource':
        filterOptions.dataSource.push(option);
        break;
      case 'featureService':
        filterOptions.featureService.push(option);
        break;
    }
  });

  return filterOptions;
};

export interface LineageFilterOptions {
  hideNodesWithoutRelationships?: boolean;
  searchFilters?: FeatureStoreLineageSearchFilters;
}

export const filterNodesWithoutRelationships = (data: LineageData): LineageData => {
  const connectedNodeIds = new Set<string>();

  data.edges.forEach((edge) => {
    if (!edge.isPositioningEdge) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
  });

  const filteredNodes = data.nodes.filter((node) => connectedNodeIds.has(node.id));
  const remainingNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = data.edges.filter(
    (edge) => remainingNodeIds.has(edge.source) && remainingNodeIds.has(edge.target),
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
};

const findConnectedNodeIds = (
  edges: LineageData['edges'],
  seedNodeIds: Set<string>,
): Set<string> => {
  const allConnectedIds = new Set<string>();

  // Always include the seed nodes
  seedNodeIds.forEach((id) => allConnectedIds.add(id));

  try {
    // Only use real edges, not positioning edges
    const realEdges = edges.filter((edge) => !edge.isPositioningEdge);
    const topologyEdges = realEdges.map((edge) => convertToLineageEdgeModel(edge));

    seedNodeIds.forEach((seedNodeId) => {
      const connectedElements = findConnectedElements(seedNodeId, topologyEdges);
      connectedElements.forEach((elementId) => {
        // Only add node IDs, not edge IDs
        if (!elementId.includes('-edge-')) {
          allConnectedIds.add(elementId);
        }
      });
    });
  } catch (error) {
    // If anything fails, just return the seed nodes
    console.warn('Connection finding failed, using seed nodes only:', error);
  }

  return allConnectedIds;
};

export const filterNodesBySearch = (
  data: LineageData,
  searchFilters: FeatureStoreLineageSearchFilters,
): LineageData => {
  const hasActiveFilters = Object.values(searchFilters).some((filter) => filter && filter.trim());

  if (!hasActiveFilters) {
    return data;
  }

  // Simple check - if no nodes, return empty
  if (data.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const matchingNodes = new Set<string>();

  // Helper function to check if node name matches any of the selected values
  const matchesFilterValues = (nodeName: string, filterValue: string): boolean => {
    const selectedValues = filterValue.split(', ').map((value) => value.trim().toLowerCase());
    const lowerNodeName = nodeName.toLowerCase();
    return selectedValues.some((selectedValue) => lowerNodeName.includes(selectedValue));
  };

  data.nodes.forEach((node) => {
    const { fsObjectTypes, name } = node;

    if (
      searchFilters.entity &&
      fsObjectTypes === 'entity' &&
      matchesFilterValues(name, searchFilters.entity)
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.featureView &&
      fsObjectTypes === 'feature_view' &&
      matchesFilterValues(name, searchFilters.featureView)
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.dataSource &&
      fsObjectTypes === 'data_source' &&
      matchesFilterValues(name, searchFilters.dataSource)
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.featureService &&
      fsObjectTypes === 'feature_service' &&
      matchesFilterValues(name, searchFilters.featureService)
    ) {
      matchingNodes.add(node.id);
    }
  });

  if (matchingNodes.size === 0) {
    console.warn('No matching nodes found, returning empty result');
    return { nodes: [], edges: [] };
  }

  const connectedNodeIds = findConnectedNodeIds(data.edges, matchingNodes);

  // Ensure we at least have the matching nodes even if connection finding fails
  if (connectedNodeIds.size === 0) {
    console.warn('No connected nodes found, falling back to matching nodes only');
    matchingNodes.forEach((id) => connectedNodeIds.add(id));
  }

  const filteredNodes = data.nodes.filter((node) => connectedNodeIds.has(node.id));
  const remainingNodeIds = new Set(filteredNodes.map((node) => node.id));

  const filteredEdges = data.edges.filter((edge) => {
    // Always keep positioning edges if both nodes exist (needed for alignment)
    if (edge.isPositioningEdge) {
      return remainingNodeIds.has(edge.source) && remainingNodeIds.has(edge.target);
    }
    // For regular edges, keep them if both nodes are connected
    return connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
  });

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
};

export const applyLineageFilters = (
  data: LineageData,
  options: LineageFilterOptions,
): LineageData => {
  let filteredData = data;

  if (options.searchFilters) {
    filteredData = filterNodesBySearch(filteredData, options.searchFilters);
  }

  if (options.hideNodesWithoutRelationships) {
    filteredData = filterNodesWithoutRelationships(filteredData);
  }

  return filteredData;
};
