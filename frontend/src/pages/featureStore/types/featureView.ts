import { FeatureStoreMeta, BatchSource, FileOptions, NameValueTypePair } from './global';
import { FeatureColumns } from './features';

// Alternative pagination format for feature views list
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
  featureViewName: string;
  featureColumns: FeatureColumns[];
  timestampField?: string;
  createdTimestampColumn?: string;
  batchSource?: BatchSource;
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

export type StandardFeatureView = {
  type: 'featureView';
  spec: {
    name: string;
    entities: string[];
    features: FeatureColumns[];
    tags?: Record<string, string>;
    ttl: string;
    batchSource: BatchSource;
    online: boolean;
    description?: string;
    owner?: string;
    entityColumns: NameValueTypePair[];
    streamSource?: StreamSource;
  };
  meta: FeatureStoreMeta;
};

export type OnDemandFeatureView = {
  type: 'onDemandFeatureView';
  spec: {
    name: string;
    features: FeatureColumns[];
    sources: OnDemandFeatureViewSources;
    description?: string;
    tags?: Record<string, string>;
    owner?: string;
    featureTransformation: FeatureTransformation;
    mode: string;
    entities: string[];
    entityColumns: NameValueTypePair[];
  };
  meta: FeatureStoreMeta;
};

export type FeatureView = StandardFeatureView | OnDemandFeatureView;

export type FeatureViewsList = {
  featureViews: FeatureView[];
  pagination: FeatureViewsPagination;
};
