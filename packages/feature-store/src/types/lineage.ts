// Feature Store Lineage Data Types
// Reusing existing types from the feature store package

import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { Entity } from './entities';
import { DataSource } from './dataSources';
import {
  FeatureView,
  StandardFeatureView,
  OnDemandFeatureView,
  StandardFeatureViewSpec,
  OnDemandFeatureViewSpec,
  StreamFeatureViewSpec,
} from './featureView';
import { FeatureService } from './featureServices';
import { Features as Feature } from './features';
import { FeatureStoreRelationship } from './global';

type NodeType = 'entity' | 'dataSource' | 'featureView' | 'featureService' | 'feature';

type LineageRelationship = FeatureStoreRelationship;

// Pagination types
interface PaginationInfo {
  totalCount: number;
  totalPages: number;
}

interface LineagePagination {
  entities: PaginationInfo;
  dataSources: PaginationInfo;
  featureViews: PaginationInfo;
  featureServices: PaginationInfo;
  features: PaginationInfo;
  relationships: PaginationInfo;
  indirectRelationships: PaginationInfo;
}

export type LineageFeatureView =
  | {
      featureView: StandardFeatureViewSpec;
    }
  | {
      onDemandFeatureView: OnDemandFeatureViewSpec;
    }
  | {
      streamFeatureView: StreamFeatureViewSpec;
    };

// Main lineage data structure
interface LineageObjects {
  entities: Entity[];
  dataSources: DataSource[];
  featureViews: LineageFeatureView[];
  featureServices: FeatureService[];
  features: Feature[];
}

export interface FeatureStoreLineage {
  project: string;
  objects: LineageObjects;
  relationships: LineageRelationship[];
  indirectRelationships: LineageRelationship[];
  pagination: LineagePagination;
}

// Type guards for discriminated unions
export function isStandardFeatureView(fv: FeatureView): fv is StandardFeatureView {
  return fv.type === 'featureView';
}

export function isOnDemandFeatureView(fv: FeatureView): fv is OnDemandFeatureView {
  return fv.type === 'onDemandFeatureView';
}

// Utility types for working with lineage data
export type LineageNodeTypes = {
  entity: Entity;
  dataSource: DataSource;
  featureView: FeatureView;
  featureService: FeatureService;
  feature: Feature;
};

export type LineageNodeByType<T extends NodeType> = LineageNodeTypes[T];

// API function type
export type GetLineageData = (opts: K8sAPIOptions, project: string) => Promise<FeatureStoreLineage>;
