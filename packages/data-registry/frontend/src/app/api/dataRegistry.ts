import {
  AssetResponse,
  AssetListResponse,
  VolumeInfo,
  ListVolumesResponse,
  ListNamespacesResponse,
  NamespaceResponse,
  CreateNamespaceRequest,
  CreateVolumeRequest,
  CreateGenericTableRequest,
  LabelListResponse,
  CreateLabelRequest,
  LabelResponse,
} from '~/app/types';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';

const registryUrl = (path: string) => `${URL_PREFIX}/api/${BFF_API_VERSION}${path}`;

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

const fetchRequest = async (url: string, method: string, body?: unknown): Promise<Response> => {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, `API error ${response.status}: ${text}`);
  }
  return response;
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
  const response = await fetchRequest(registryUrl(`/${project}/namespaces`), 'POST', data);
  return response.json();
};

export const deleteCollection = async (project: string, collection: string): Promise<void> => {
  await fetchRequest(registryUrl(`/${project}/namespaces/${collection}`), 'DELETE');
};

export { ApiError };

// Assets (generic tables)

export const fetchAssets = (project: string, collection: string): Promise<AssetListResponse> =>
  fetchJSON(registryUrl(`/${project}/namespaces/${collection}/generic-tables`));

export const fetchGenericTable = (
  project: string,
  collection: string,
  name: string,
): Promise<AssetResponse> =>
  fetchJSON(
    registryUrl(
      `/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(collection)}/generic-tables/${encodeURIComponent(name)}`,
    ),
  );

export const deleteGenericTable = (
  project: string,
  collection: string,
  name: string,
): Promise<void> =>
  fetchRequest(
    registryUrl(
      `/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(collection)}/generic-tables/${encodeURIComponent(name)}`,
    ),
    'DELETE',
  ).then(() => undefined);

// Volumes

export const fetchVolumes = (project: string, collection: string): Promise<ListVolumesResponse> =>
  fetchJSON(registryUrl(`/${project}/namespaces/${collection}/volumes`));

export const createVolume = async (
  project: string,
  collection: string,
  data: CreateVolumeRequest,
): Promise<VolumeInfo> => {
  const response = await fetchRequest(
    registryUrl(`/${project}/namespaces/${collection}/volumes`),
    'POST',
    data,
  );
  return response.json();
};

export const fetchVolume = (
  project: string,
  collection: string,
  name: string,
): Promise<VolumeInfo> =>
  fetchJSON(
    registryUrl(
      `/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(collection)}/volumes/${encodeURIComponent(name)}`,
    ),
  );

export const deleteVolume = (project: string, collection: string, name: string): Promise<void> =>
  fetchRequest(
    registryUrl(
      `/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(collection)}/volumes/${encodeURIComponent(name)}`,
    ),
    'DELETE',
  ).then(() => undefined);

// Generic tables (structured assets)

export const createGenericTable = async (
  project: string,
  collection: string,
  data: CreateGenericTableRequest,
): Promise<AssetResponse> => {
  const response = await fetchRequest(
    registryUrl(`/${project}/namespaces/${collection}/generic-tables`),
    'POST',
    data,
  );
  return response.json();
};

// Labels

export const fetchLabels = (project: string): Promise<LabelListResponse> =>
  fetchJSON(registryUrl(`/${project}/labels`));

export const createLabel = async (
  project: string,
  data: CreateLabelRequest,
): Promise<LabelResponse> => {
  const response = await fetchRequest(registryUrl(`/${project}/labels`), 'POST', data);
  return response.json();
};

export const deleteLabel = async (project: string, label: string): Promise<void> => {
  await fetchRequest(registryUrl(`/${project}/labels/${encodeURIComponent(label)}`), 'DELETE');
};
