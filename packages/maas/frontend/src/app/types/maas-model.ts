// From packages/maas/bff/internal/models/model.go
export type MaaSModel = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  ready: boolean;
  url?: string;
};

export type MaaSModelRef = {
  name: string;
  namespace: string;
  modelRef: ModelReference;
  phase?: string;
  endpoint?: string;
  displayName?: string;
  description?: string;
};

export type ModelReference = {
  kind: string;
  name: string;
};

export type CreateMaaSModelRefRequest = {
  name: string;
  namespace: string;
  modelRef: ModelReference;
  endpointOverride?: string;
  uid?: string;
  displayName?: string;
  description?: string;
};

export type UpdateMaaSModelRefRequest = {
  modelRef: ModelReference;
  endpointOverride?: string;
  displayName?: string;
  description?: string;
};

export type DeleteMaaSModelRefResponse = {
  message: string;
};
