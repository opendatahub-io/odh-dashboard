import * as React from 'react';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';

const AGGREGATED_DISCOVERY_ACCEPT =
  'application/json;v=v2;g=apidiscovery.k8s.io;as=APIGroupDiscoveryList';

type APIGroupDiscoveryResource = {
  resource: string;
  responseKind: {
    group: string;
    version: string;
    kind: string;
  };
  scope: 'Namespaced' | 'Cluster';
  verbs: string[];
};

type APIGroupDiscoveryVersion = {
  version: string;
  resources: APIGroupDiscoveryResource[];
};

export type APIGroupDiscoveryItem = {
  metadata: {
    name: string;
  };
  versions: APIGroupDiscoveryVersion[];
};

type APIGroupDiscoveryList = {
  kind: string;
  apiVersion: string;
  items: APIGroupDiscoveryItem[];
};

export type DiscoveredResource = {
  name: string;
  kind: string;
  apiGroup: string;
};

export type ApiResourcesData = {
  apiGroups: string[];
  resources: DiscoveredResource[];
};

const fetchDiscovery = async (
  url: string,
  signal?: AbortSignal,
): Promise<APIGroupDiscoveryList> => {
  const response = await fetch(url, {
    headers: { Accept: AGGREGATED_DISCOVERY_ACCEPT },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
};

export const parseDiscoveryItems = (items: APIGroupDiscoveryItem[]): ApiResourcesData => {
  const apiGroups: string[] = [];
  const resources: DiscoveredResource[] = [];
  const seenResources = new Set<string>();

  for (const item of items) {
    const groupName = item.metadata.name;
    apiGroups.push(groupName);

    if (item.versions.length === 0) {
      continue;
    }

    // The Aggregated Discovery API returns versions in preference order;
    // versions[0] is the preferred version and typically contains the full resource set.
    for (const res of item.versions[0].resources) {
      if (res.resource.includes('/')) {
        continue;
      }

      const key = `${groupName}/${res.resource}`;
      if (!seenResources.has(key)) {
        seenResources.add(key);
        resources.push({
          name: res.resource,
          kind: res.responseKind.kind,
          apiGroup: groupName,
        });
      }
    }
  }

  return { apiGroups, resources };
};

const EMPTY_DATA: ApiResourcesData = { apiGroups: [], resources: [] };

const useApiResources = (): FetchStateObject<ApiResourcesData> => {
  const fetchCallback = React.useCallback(async (opts: { signal?: AbortSignal }) => {
    const [coreResult, apisResult] = await Promise.all([
      fetchDiscovery('/api/k8s/api', opts.signal),
      fetchDiscovery('/api/k8s/apis', opts.signal),
    ]);

    const coreData = parseDiscoveryItems(coreResult.items);
    const apisData = parseDiscoveryItems(apisResult.items);

    return {
      apiGroups: [...coreData.apiGroups, ...apisData.apiGroups],
      resources: [...coreData.resources, ...apisData.resources],
    };
  }, []);

  return useFetch(fetchCallback, EMPTY_DATA);
};

export default useApiResources;
