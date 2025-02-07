import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardLabels } from '~/k8sTypes';

export type BaseModel = {
  catalog?: string;
  repository?: string;
  name?: string;
};

export enum ArtifactsProtocol {
  OCI = 'oci',
}

export type CatalogArtifacts = {
  protocol?: ArtifactsProtocol;
  tags?: string[];
  uri?: string;
};

export type CatalogModel = {
  repository: string;
  name: string;
  provider?: string;
  description?: string;
  longDescription?: string;
  logo?: string;
  readme?: string;
  language?: string[];
  license?: string;
  licenseLink?: string;
  maturity?: string;
  libraryName?: string;
  baseModel?: BaseModel[];
  labels?: string[];
  tasks?: string[];
  createTimeSinceEpoch?: number;
  lastUpdateTimeSinceEpoch?: number;
  artifacts?: CatalogArtifacts[];
};

export type ModelCatalogSource = {
  source: string;
  models: CatalogModel[];
};

// Temporary type for MVP - will be replaced with remote model catalog sources
// See: https://issues.redhat.com/browse/RHOAISTRAT-455
export type ModelCatalogConfigMap = K8sResourceCommon & {
  metadata: {
    name: string;
    labels: DashboardLabels & {
      'opendatahub.io/model-catalog': 'true';
    };
  };
  data?: {
    source: string;
    models: string; // JSON string of CatalogModel[]
  };
};
