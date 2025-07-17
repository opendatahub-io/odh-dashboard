import { K8sAPIOptions } from '#~/k8sTypes.ts';

export type FeatureStoreMeta = {
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
};

export type FileOptions = {
  fileFormat: {
    parquetFormat: Record<string, string>;
  };
  uri: string;
};

export type FeatureStoreProject = {
  spec: {
    name: string;
  };
  meta: FeatureStoreMeta;
};

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

export type Entities = {
  entities: Entity[];
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

export type FeatureColumns = {
  name: string;
  valueType: string;
  tags?: Record<string, string>;
  description?: string;
};

export type BatchSource = {
  type: string;
  timestampField: string;
  createdTimestampColumn: string;
  fileOptions: FileOptions;
  name: string;
  description: string;
  tags: Record<string, string>;
};

export type Features = {
  featureViewName: string;
  featureColumns: FeatureColumns[];
  timestampField?: string;
  createdTimestampColumn?: string;
  batchSource?: BatchSource;
}[];

export type FeatureService = {
  spec: {
    name: string;
    features?: Features;
    tags?: Record<string, string>;
    description?: string;
    owner?: string;
  };
  meta: FeatureStoreMeta;
};

export type FeatureServices = {
  featureServices: FeatureService[];
};

export type EntityColumns = [
  {
    name: string;
    valueType: string;
  },
];

export type FeatureView =
  // EitherNotBoth<
  {
    featureView: {
      spec: {
        name: string;
        entities: string[];
        features: FeatureColumns[];
        tags?: Record<string, string>;
        ttl: string;
        batchSource: BatchSource & {
          dataSourceClassType: string;
        };
        online: boolean;
        description?: string;
        owner: string;
        entityColumns: EntityColumns;
      };
      meta: FeatureStoreMeta & {
        materializationIntervals: [
          {
            startTime: string;
            endTime: string;
          },
        ];
      };
    };
  };
//   {
// TODO: need to update this when we get schema from backend, ecspecially sources
//     onDemandFeatureView: {
//       spec: {
//         name: string;
//         features: FeatureColumns[];
//         sources: Record<string, any>;
//         description: string;
//         tags: Record<string, string>;
//         owner: string;
//         featureTransformation: {
//           userDefinedFunction: {
//             name: string;
//             body: string;
//             bodyText: string;
//           };
//         };
//         mode: string;
//         entities: string[];
//         entityColumns: EntityColumns;
//       };
//       meta: FeatureStoreMeta;
//     };
//   }
// >;

export type FeatureStoreError = {
  code: string;
  message: string;
};

export type GetListFeatureStoreProjects = (
  opts: K8sAPIOptions,
  name: string,
  namespace: string,
) => Promise<FeatureStoreProject[]>;

export type FeatureStoreAPIs = {
  listFeatureStoreProject: GetListFeatureStoreProjects;
};
