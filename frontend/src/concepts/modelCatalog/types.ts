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
  create?: number;
  lastUpdateTimeSinceEpoch?: number;
  artifacts?: CatalogArtifacts[];
};

export type ModelCatalogSource = {
  source: string;
  models: CatalogModel[];
};
