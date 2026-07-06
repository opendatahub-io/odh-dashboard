import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStoreMeta, BatchSource, FileOptions, NameValueTypePair } from './global';
import { FeatureColumns } from './features';
import { Relationship } from '../screens/featureViews/utils';

export type FeatureViewsPagination = {
  totalCount: number;
  totalPages: number;
};

export type DataSource =
  | {
      type?: string;
      timestampField?: string;
      createdTimestampColumn?: string;
      fileOptions?: FileOptions;
      name: string;
      description?: string;
      tags?: Record<string, string>;
    }
  | {
      type?: string;
      requestDataOptions?: {
        schema: FeatureColumns[];
      };
      name: string;
    };

export type DataSources = {
  data_sources: DataSource[];
};

export type StreamSource = {
  fileOptions: FileOptions;
  type: string;
  dataSourceClassType: string;
  name: string;
  batchSource: BatchSource;
  meta: FeatureStoreMeta;
};

export type RequestDataSource = {
  type: string;
  requestDataOptions: {
    schema: FeatureColumns[];
  };
  name: string;
  meta: FeatureStoreMeta;
};

export type FeatureViewProjection = {
  name: string;
  featureViewName: string;
  featureColumns: FeatureColumns[];
  timestampField?: string;
  createdTimestampColumn?: string;
  batchSource?: BatchSource;
  streamSource?: StreamSource;
};

export type OnDemandFeatureViewSources = {
  [key: string]: {
    requestDataSource?: RequestDataSource;
    featureViewProjection?: FeatureViewProjection;
  };
};

export type UserDefinedFunction = {
  name: string;
  body: string;
  bodyText: string;
};

export type FeatureTransformation = {
  userDefinedFunction: UserDefinedFunction;
};

export type StandardFeatureViewSpec = {
  spec: {
    name: string;
    entities: string[];
    features: FeatureColumns[];
    tags?: Record<string, string>;
    ttl: string;
    batchSource: BatchSource;
    online?: boolean;
    offline?: boolean;
    description?: string;
    owner?: string;
    entityColumns: NameValueTypePair[];
    streamSource?: StreamSource;
    mode?: string;
  };
  meta: FeatureStoreMeta;
};

export type OnDemandFeatureViewSpec = {
  spec: {
    name: string;
    features: FeatureColumns[];
    sources: OnDemandFeatureViewSources;
    description?: string;
    tags?: Record<string, string>;
    owner?: string;
    online?: boolean;
    offline?: boolean;
    featureTransformation: FeatureTransformation;
    mode: string;
    entities: string[];
    entityColumns: NameValueTypePair[];
  };
  meta: FeatureStoreMeta;
};

export type StreamFeatureViewSpec = {
  spec: {
    name: string;
    entities: string[];
    features: FeatureColumns[];
    entityColumns: NameValueTypePair[];
    tags?: Record<string, string>;
    description?: string;
    owner?: string;
    ttl: string;
    batchSource: BatchSource;
    streamSource: StreamSource;
    userDefinedFunction: UserDefinedFunction;
    mode: string;
    timestampField?: string;
    featureTransformation: FeatureTransformation;
  };
  meta: FeatureStoreMeta;
};

export type StandardFeatureView = StandardFeatureViewSpec & {
  type: 'featureView';
  featureDefinition?: string;
  relationships: Relationship[];
  project?: string;
};

export type OnDemandFeatureView = OnDemandFeatureViewSpec & {
  type: 'onDemandFeatureView';
  featureDefinition?: string;
  relationships: Relationship[];
  project?: string;
};

export type StreamFeatureView = StreamFeatureViewSpec & {
  type: 'streamFeatureView';
  featureDefinition?: string;
  relationships: Relationship[];
  project?: string;
};

export type FeatureView = StandardFeatureView | OnDemandFeatureView | StreamFeatureView;

export type FeatureViewsList = {
  featureViews: FeatureView[];
  relationships: Record<string, Relationship[]>;
  pagination: FeatureViewsPagination;
};

export type GetFeatureViews = (
  opts: K8sAPIOptions,
  project?: string,
  entity?: string,
  featureService?: string,
  feature?: string,
  data_source?: string,
) => Promise<FeatureViewsList>;

export type GetFeatureViewsByName = (
  opts: K8sAPIOptions,
  project?: string,
  featureViewName?: string,
) => Promise<FeatureView>;
