import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { DataSource } from './dataSources';
import { FeatureStoreMeta, FeatureStorePagination, FeatureStoreRelationship } from './global';

export type Entity = {
  spec: {
    name: string;
    valueType?: string;
    description?: string;
    joinKey?: string;
    tags?: Record<string, string>;
    owner?: string;
  };
  meta: FeatureStoreMeta;
  project?: string;
  featureDefinition?: string;
  dataSources?: DataSource[];
};

export type EntityList = {
  entities: Entity[];
  pagination: FeatureStorePagination;
  relationships: Record<string, FeatureStoreRelationship[]>;
};

export type GetEntities = (opts: K8sAPIOptions, project?: string) => Promise<EntityList>;
export type GetEntityByName = (
  opts: K8sAPIOptions,
  project: string,
  entityName: string,
) => Promise<Entity>;
export type Tags = Record<string, string>;
