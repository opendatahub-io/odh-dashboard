import { SelectionOptions } from '@odh-dashboard/internal/components/MultiSelection.js';
import {
  LineageData,
  convertToLineageEdgeModel,
} from '@odh-dashboard/internal/components/lineage/types';
import { findConnectedElements } from '@odh-dashboard/internal/components/lineage/graphUtils';
import { FeatureStoreLineage } from '../../types/lineage';
import { FeatureStoreLineageSearchFilters } from '../../types/toolbarTypes';

export const extractFilterOptionsFromLineage = (
  lineageData: FeatureStoreLineage,
): Record<string, SelectionOptions[]> => {
  return {
    entity: lineageData.objects.entities.map((entity) => ({
      id: `${lineageData.project || 'default'}-entity-${entity.spec.name}`,
      name: entity.spec.name,
      description: entity.spec.description,
    })),
    featureView: lineageData.objects.featureViews.map((featureView) => {
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
    }),
    dataSource: lineageData.objects.dataSources.map((dataSource) => ({
      id: `${lineageData.project || 'default'}-datasource-${dataSource.name}`,
      name: dataSource.name,
      description: dataSource.description,
    })),
    featureService: lineageData.objects.featureServices.map((featureService) => ({
      id: `${lineageData.project || 'default'}-featureservice-${featureService.spec.name}`,
      name: featureService.spec.name,
      description: featureService.spec.description,
    })),
  };
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

  try {
    const topologyEdges = edges.map((edge) => convertToLineageEdgeModel(edge));

    seedNodeIds.forEach((seedNodeId) => {
      const connectedElements = findConnectedElements(seedNodeId, topologyEdges);
      connectedElements.forEach((elementId) => {
        // Filter to only include node IDs (exclude edge IDs)
        if (!elementId.includes('-edge-')) {
          allConnectedIds.add(elementId);
        }
      });
    });
  } catch (error) {
    console.error('Error in findConnectedNodeIds:', error);
    // Fallback: just return the seed nodes if the utility fails
    seedNodeIds.forEach((id) => allConnectedIds.add(id));
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

  const matchingNodes = new Set<string>();

  data.nodes.forEach((node) => {
    const { fsObjectTypes, name } = node;

    if (
      searchFilters.entity &&
      fsObjectTypes === 'entity' &&
      name.toLowerCase().includes(searchFilters.entity.toLowerCase())
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.featureView &&
      fsObjectTypes === 'feature_view' &&
      name.toLowerCase().includes(searchFilters.featureView.toLowerCase())
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.dataSource &&
      fsObjectTypes === 'data_source' &&
      name.toLowerCase().includes(searchFilters.dataSource.toLowerCase())
    ) {
      matchingNodes.add(node.id);
    }

    if (
      searchFilters.featureService &&
      fsObjectTypes === 'feature_service' &&
      name.toLowerCase().includes(searchFilters.featureService.toLowerCase())
    ) {
      matchingNodes.add(node.id);
    }
  });

  if (matchingNodes.size === 0) {
    console.warn('No matching nodes found, returning empty result');
    return { nodes: [], edges: [] };
  }

  const connectedNodeIds = findConnectedNodeIds(data.edges, matchingNodes);

  const filteredNodes = data.nodes.filter((node) => connectedNodeIds.has(node.id));
  const filteredEdges = data.edges.filter(
    (edge) => connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target),
  );

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
