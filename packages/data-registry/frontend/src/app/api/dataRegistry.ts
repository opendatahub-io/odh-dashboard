import {
  AssetListResponse,
  ListVolumesResponse,
  ListNamespacesResponse,
  NamespaceResponse,
  CreateNamespaceRequest,
  LabelListResponse,
} from '~/app/types';

// In federated mode: browser → dashboard backend → DR webpack (9103) → BFF (8080) → Feast
const registryUrl = (path: string) => `/_mf/dataRegistry/api/v1${path}`;

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const fetchJSON = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, `API error ${response.status}: ${text}`);
  }
  return response.json();
};

const fetchWithBody = async <T>(url: string, method: string, body?: unknown): Promise<T | void> => {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, `API error ${response.status}: ${text}`);
  }
  if (response.status === 204) {
    return undefined;
  }
  return response.json();
};

// Collections (namespaces)

export const fetchCollections = (project: string): Promise<ListNamespacesResponse> =>
  fetchJSON(registryUrl(`/${project}/namespaces`));

export const fetchCollectionDetails = (
  project: string,
  collection: string,
): Promise<NamespaceResponse> => fetchJSON(registryUrl(`/${project}/namespaces/${collection}`));

export const createCollection = async (
  project: string,
  data: CreateNamespaceRequest,
): Promise<NamespaceResponse> => {
  const result = await fetchWithBody<NamespaceResponse>(
    registryUrl(`/${project}/namespaces`),
    'POST',
    data,
  );
  // POST always returns a body (not 204)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return result as NamespaceResponse;
};

export const deleteCollection = (project: string, collection: string): Promise<void> =>
  fetchWithBody(registryUrl(`/${project}/namespaces/${collection}`), 'DELETE').then(
    () => undefined,
  );

export { ApiError };

// Assets (generic tables)

export const fetchAssets = (project: string, collection: string): Promise<AssetListResponse> =>
  fetchJSON(registryUrl(`/${project}/namespaces/${collection}/generic-tables`));

// Volumes

export const fetchVolumes = (project: string, collection: string): Promise<ListVolumesResponse> =>
  fetchJSON(registryUrl(`/${project}/namespaces/${collection}/volumes`));

// Labels

export const fetchLabels = (project: string): Promise<LabelListResponse> =>
  fetchJSON(registryUrl(`/${project}/labels`));
