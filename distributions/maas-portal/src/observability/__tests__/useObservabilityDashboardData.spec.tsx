import { act, renderHook, waitFor } from '@testing-library/react';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import HostApiProvider from '../../providers/HostApiProvider';
import { PORTAL_BASE_PATH } from '../../portalPaths';
import { MAAS_NAMESPACES_PATH, PERSES_PROXY_BASE_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';

// Keep dashboard discovery, access reviews, and filtering real, without loading chart plugins.
jest.mock('@odh-dashboard/observability/dashboard', () =>
  jest.requireActual('../../../../../packages/observability/src/api/usePersesDashboards'),
);
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({ k8sCreateResource: jest.fn() }));

const renderData = () =>
  renderHook(() => useObservabilityDashboardData(), { wrapper: HostApiProvider });
const mockResponse = (data: unknown, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => data,
  headers: new Headers(),
});

describe('useObservabilityDashboardData', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.clearAllMocks();
    jest.mocked(k8sCreateResource).mockResolvedValue({
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      status: { allowed: false },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps MaaS namespaces and uses portal-prefixed MaaS and Perses requests', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        mockResponse(
          url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
            ? { data: [{ name: 'team-a', displayName: 'Team A' }, { name: 'team-b' }] }
            : [],
        ),
      );

    const { result } = renderData();

    await waitFor(() =>
      expect(result.current.projects).toEqual([
        { name: 'team-a', label: 'Team A' },
        { name: 'team-b', label: 'team-b' },
      ]),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      `${PERSES_PROXY_BASE_PATH}/api/v1/dashboards`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([true, false])(
    'should wait for the access review and filter dashboards for allowed=%s',
    async (allowed) => {
      let resolveAccess: (value: {
        apiVersion: string;
        kind: string;
        status: { allowed: boolean };
      }) => void = () => undefined;
      jest.mocked(k8sCreateResource).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAccess = resolve;
          }),
      );
      global.fetch = jest
        .fn()
        .mockImplementation(async (url) =>
          mockResponse(
            url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
              ? { data: [] }
              : [
                  { metadata: { name: 'dashboard-models' } },
                  { metadata: { name: 'dashboard-models-admin' } },
                ],
          ),
        );
      const { result } = renderData();
      await waitFor(() => expect(result.current.projectsLoaded).toBe(true));
      expect(result.current.dashboardsLoaded).toBe(false);
      await act(async () => {
        resolveAccess({
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          status: { allowed },
        });
      });
      await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));
      expect(result.current.dashboards.map(({ metadata }) => metadata.name)).toEqual([
        allowed ? 'dashboard-models-admin' : 'dashboard-models',
      ]);
      expect(k8sCreateResource).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            spec: {
              resourceAttributes: {
                group: 'monitoring.coreos.com',
                resource: 'prometheuses',
                subresource: 'api',
                verb: 'get',
                namespace: 'openshift-monitoring',
                name: 'k8s',
              },
            },
          }),
        }),
      );
    },
  );

  it.each([403, 503])(
    'should preserve project request error status %s for the error page',
    async (status) => {
      global.fetch = jest
        .fn()
        .mockImplementation(async (url) =>
          url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
            ? mockResponse({}, status)
            : mockResponse([]),
        );
      const { result } = renderData();
      await waitFor(() => expect(result.current.projectsLoadError).toMatchObject({ status }));
      expect(result.current.projects).toEqual([]);
    },
  );

  it('should reject malformed namespace responses', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        mockResponse(
          url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}` ? { data: [{ name: 42 }] } : [],
        ),
      );
    const { result } = renderData();
    await waitFor(() =>
      expect(result.current.projectsLoadError?.message).toBe('Invalid response format'),
    );
    expect(result.current.projects).toEqual([]);
  });
});
