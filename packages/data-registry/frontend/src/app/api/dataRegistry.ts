import {
  AssetListResponse,
  ListVolumesResponse,
  ListNamespacesResponse,
  NamespaceResponse,
  CreateNamespaceRequest,
  CreateVolumeRequest,
  VolumeInfo,
  LabelListResponse,
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

// Labels

export const fetchLabels = (project: string): Promise<LabelListResponse> =>
  fetchJSON(registryUrl(`/${project}/labels`));
