import { APIOptions } from 'mod-arch-core';
import { ModelRegistryBase } from '~/app/types';
import { NamedQuery, PaginationParams } from '~/app/modelCatalogTypes';
import {
  CatalogFilterStringOption,
  CatalogFilterNumberOption,
} from '~/app/shared/components/catalog/types/catalogFilterTypes';
import { CatalogListParams } from '~/app/shared/types/catalogTypes';

// Catalog resources use externalId and make the shared resource fields optional.
type ServingRuntimeBase = Partial<Omit<ModelRegistryBase, 'externalID'>> & {
  externalId?: string;
};

export interface ServingRuntime extends ServingRuntimeBase {
  displayName?: string;
  sourceId?: string;
  provider?: string;
  readme?: string;
  logo?: string;
  tags?: string[];
  license?: string;
  licenseLink?: string;
  documentationUrl?: string;
  repositoryUrl?: string;
  supportedModelFormats?: ServingRuntimeModelFormat[];
  capabilities?: ServingRuntimeCapabilities;
  versionCount?: number;
  publishedDate?: string;
  lastUpdated?: string;
}

export interface ServingRuntimeVersion extends ServingRuntimeBase {
  artifactType: string;
  version: string;
  image: string;
  supportLevel?: ServingRuntimeSupportLevel;
  supportedModelFormats?: ServingRuntimeModelFormat[];
  protocolVersions?: string[];
  recommendedResources?: ServingRuntimeResourceRecommendation;
  defaultArgs?: string[];
  env?: ServingRuntimeEnvVar[];
  servingRuntimeTemplate?: string;
  llmInferenceServiceTemplate?: string;
  deprecated?: boolean;
  publishedDate?: string;
}

export interface ServingRuntimeModelFormat {
  name: string;
  version?: string;
  autoSelect?: boolean;
  priority?: number;
}

export type ServingRuntimeSupportLevel =
  | 'supported'
  | 'techPreview'
  | 'developerPreview'
  | 'community';

export interface ServingRuntimeCapabilities {
  requiresGPU?: boolean;
  supportedAccelerators?: string[];
  multiModel?: boolean;
}

export interface ServingRuntimeResourceRecommendation {
  minimal?: ServingRuntimeResourceTier;
  recommended?: ServingRuntimeResourceTier;
  high?: ServingRuntimeResourceTier;
}

export interface ServingRuntimeResourceTier {
  cpu?: string;
  memory?: string;
  accelerator?: Record<string, string>;
}

export interface ServingRuntimeEnvVar {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  secret?: boolean;
}

export interface ServingRuntimeList extends PaginationParams {
  items: ServingRuntime[];
}

export interface ServingRuntimeVersionList extends PaginationParams {
  items: ServingRuntimeVersion[];
}

export interface ServingRuntimeFilterOptionsList {
  filters?: Record<string, CatalogFilterStringOption | CatalogFilterNumberOption>;
  namedQueries?: Record<string, NamedQuery>;
}

export interface ServingRuntimeVersionListParams extends CatalogListParams {
  sortOrder?: 'ASC' | 'DESC';
}

export interface ServingRuntimeListParams extends ServingRuntimeVersionListParams {
  name?: string;
  q?: string;
  source?: string[];
  sourceLabel?: string[];
}

export interface ServingRuntimeCatalogAPIs {
  getServingRuntimeList: (
    opts: APIOptions,
    params?: ServingRuntimeListParams,
  ) => Promise<ServingRuntimeList>;
  getServingRuntime: (opts: APIOptions, runtimeId: string) => Promise<ServingRuntime | null>;
  getServingRuntimeVersions: (
    opts: APIOptions,
    runtimeId: string,
    params?: ServingRuntimeVersionListParams,
  ) => Promise<ServingRuntimeVersionList>;
  getServingRuntimeFilterOptionList: (opts: APIOptions) => Promise<ServingRuntimeFilterOptionsList>;
}
