import { act } from 'react';
import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import useApiResources, {
  parseDiscoveryItems,
  APIGroupDiscoveryItem,
} from '#~/pages/projects/projectRoles/useApiResources';

const mockCoreResponse = {
  kind: 'APIGroupDiscoveryList',
  apiVersion: 'apidiscovery.k8s.io/v2',
  items: [
    {
      metadata: { name: '' },
      versions: [
        {
          version: 'v1',
          resources: [
            {
              resource: 'pods',
              responseKind: { group: '', version: 'v1', kind: 'Pod' },
              scope: 'Namespaced' as const,
              verbs: ['get', 'list'],
            },
            {
              resource: 'configmaps',
              responseKind: { group: '', version: 'v1', kind: 'ConfigMap' },
              scope: 'Namespaced' as const,
              verbs: ['get', 'list', 'create'],
            },
          ],
        },
      ],
    },
  ],
};

const mockApisResponse = {
  kind: 'APIGroupDiscoveryList',
  apiVersion: 'apidiscovery.k8s.io/v2',
  items: [
    {
      metadata: { name: 'apps' },
      versions: [
        {
          version: 'v1',
          resources: [
            {
              resource: 'deployments',
              responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
              scope: 'Namespaced' as const,
              verbs: ['get', 'list', 'create'],
            },
          ],
        },
      ],
    },
  ],
};

describe('useApiResources', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return empty data initially then loaded data after fetch', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            String(url).endsWith('/api/k8s/api') ? mockCoreResponse : mockApisResponse,
          ),
      }),
    );

    const renderResult = testHook(useApiResources)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { apiGroups: [], resources: [] },
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: {
          apiGroups: ['', 'apps'],
          resources: [
            { name: 'pods', kind: 'Pod', apiGroup: '' },
            { name: 'configmaps', kind: 'ConfigMap', apiGroup: '' },
            { name: 'deployments', kind: 'Deployment', apiGroup: 'apps' },
          ],
        },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should call both /api/k8s/api and /api/k8s/apis endpoints', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            String(url).endsWith('/api/k8s/api') ? mockCoreResponse : mockApisResponse,
          ),
      }),
    );

    const renderResult = testHook(useApiResources)();
    await renderResult.waitForNextUpdate();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/k8s/api',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: expect.stringContaining('apidiscovery') }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/k8s/apis',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: expect.stringContaining('apidiscovery') }),
      }),
    );
  });

  it('should handle fetch errors gracefully', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Forbidden',
      }),
    );

    const renderResult = testHook(useApiResources)();
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeDefined();
    expect(renderResult.result.current.data).toEqual({ apiGroups: [], resources: [] });
  });

  it('should support refresh', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            String(url).endsWith('/api/k8s/api') ? mockCoreResponse : mockApisResponse,
          ),
      }),
    );

    const renderResult = testHook(useApiResources)();
    await renderResult.waitForNextUpdate();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(2);

    await act(() => renderResult.result.current.refresh());

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});

describe('parseDiscoveryItems', () => {
  it('should extract API groups and resources from discovery items', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: 'apps' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get', 'list', 'create'],
              },
              {
                resource: 'statefulsets',
                responseKind: { group: 'apps', version: 'v1', kind: 'StatefulSet' },
                scope: 'Namespaced',
                verbs: ['get', 'list'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.apiGroups).toEqual(['apps']);
    expect(result.resources).toEqual([
      { name: 'deployments', kind: 'Deployment', apiGroup: 'apps' },
      { name: 'statefulsets', kind: 'StatefulSet', apiGroup: 'apps' },
    ]);
  });

  it('should handle core API group with empty string name', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: '' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'pods',
                responseKind: { group: '', version: 'v1', kind: 'Pod' },
                scope: 'Namespaced',
                verbs: ['get', 'list'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.apiGroups).toEqual(['']);
    expect(result.resources).toEqual([{ name: 'pods', kind: 'Pod', apiGroup: '' }]);
  });

  it('should skip subresources (resources containing a slash)', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: '' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'pods',
                responseKind: { group: '', version: 'v1', kind: 'Pod' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
              {
                resource: 'pods/log',
                responseKind: { group: '', version: 'v1', kind: 'PodLog' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
              {
                resource: 'pods/status',
                responseKind: { group: '', version: 'v1', kind: 'Pod' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].name).toBe('pods');
  });

  it('should deduplicate resources with the same group/name', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: 'apps' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get', 'list'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.resources).toHaveLength(1);
  });

  it('should handle groups with no versions', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: 'empty.group.io' },
        versions: [],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.apiGroups).toEqual(['empty.group.io']);
    expect(result.resources).toEqual([]);
  });

  it('should handle empty items array', () => {
    const result = parseDiscoveryItems([]);

    expect(result.apiGroups).toEqual([]);
    expect(result.resources).toEqual([]);
  });

  it('should handle multiple API groups with distinct resources', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: '' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'configmaps',
                responseKind: { group: '', version: 'v1', kind: 'ConfigMap' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
        ],
      },
      {
        metadata: { name: 'apps' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
        ],
      },
      {
        metadata: { name: 'batch' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'jobs',
                responseKind: { group: 'batch', version: 'v1', kind: 'Job' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.apiGroups).toEqual(['', 'apps', 'batch']);
    expect(result.resources).toHaveLength(3);
    expect(result.resources.map((r) => r.name)).toEqual(['configmaps', 'deployments', 'jobs']);
  });

  it('should only use the preferred (first) API version', () => {
    const items: APIGroupDiscoveryItem[] = [
      {
        metadata: { name: 'apps' },
        versions: [
          {
            version: 'v1',
            resources: [
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
          {
            version: 'v1beta1',
            resources: [
              {
                resource: 'deployments',
                responseKind: { group: 'apps', version: 'v1beta1', kind: 'Deployment' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
              {
                resource: 'betaonlyresource',
                responseKind: { group: 'apps', version: 'v1beta1', kind: 'BetaOnly' },
                scope: 'Namespaced',
                verbs: ['get'],
              },
            ],
          },
        ],
      },
    ];

    const result = parseDiscoveryItems(items);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].name).toBe('deployments');
  });
});
