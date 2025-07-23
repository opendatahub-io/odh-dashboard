import { K8sAPIOptions } from '#~/k8sTypes';
import { FeatureStoreMeta, FeatureStorePagination } from './global';

export type Entity = {
  spec: {
    name: string;
    valueType?: string;
    description?: string;
    joinKey?: string;
    tags?: Record<string, string>;
  };
  meta: FeatureStoreMeta;
};

export type EntityList = {
  entities: Entity[];
  pagination: FeatureStorePagination;
};

export type GetEntities = (opts: K8sAPIOptions, project?: string) => Promise<EntityList>;
