import {
  isRHOAI,
  clusterExtensionToSubscriptionStatus,
  getCSVForApp,
} from '../utils/resourceUtils';
import * as resourceUtils from '../utils/resourceUtils';
import {
  OdhPlatformType,
  DataScienceClusterKindStatus,
  ClusterExtensionKind,
  OdhApplication,
  SubscriptionStatusData,
} from '../types';

describe('resourceUtils', () => {
  describe('isRHOAI', () => {
    const mockFastify = { log: { error: jest.fn() } } as any;
    const mockStatus = (name: string): DataScienceClusterKindStatus => ({
      conditions: [
        {
          type: 'Ready',
          status: 'True',
        },
      ],
      components: {},
      phase: 'Running',
      release: {
        name,
      },
    });

    it('returns true for Self-managed RHOAI', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.SELF_MANAGED_RHOAI));
      expect(isRHOAI(mockFastify)).toBe(true);
    });

    it('returns true for Managed RHOAI', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.MANAGED_RHOAI));
      expect(isRHOAI(mockFastify)).toBe(true);
    });

    it('returns false for Opendatahub', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.OPEN_DATA_HUB));
      expect(isRHOAI(mockFastify)).toBe(false);
    });

    it('returns false when error', () => {
      const errorMessage = 'Tried to use DSC before ResourceWatcher could successfully fetch it';
      jest.spyOn(resourceUtils, 'getClusterStatus').mockImplementation((fastify) => {
        fastify.log.error(errorMessage);
        return undefined;
      });
      expect(isRHOAI(mockFastify)).toBe(false);
      expect(mockFastify.log.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('clusterExtensionToSubscriptionStatus', () => {
    const makeClusterExtension = (
      overrides: Partial<ClusterExtensionKind> = {},
    ): ClusterExtensionKind =>
      ({
        apiVersion: 'olm.operatorframework.io/v1',
        kind: 'ClusterExtension',
        metadata: { name: 'rhods' },
        spec: {
          namespace: 'redhat-ods-operator',
          source: {
            sourceType: 'Catalog',
            catalog: { packageName: 'rhods-operator', channels: ['stable', 'alpha'] },
          },
        },
        status: {
          install: { bundle: { name: 'rhods-operator.v2.19.0', version: '2.19.0' } },
          conditions: [
            {
              type: 'Installed',
              status: 'True',
              reason: 'Succeeded',
              lastTransitionTime: '2026-10-06T00:00:00Z',
            },
          ],
        },
        ...overrides,
      } as ClusterExtensionKind);

    it('should map a successfully installed ClusterExtension to subscription status data', () => {
      expect(clusterExtensionToSubscriptionStatus(makeClusterExtension())).toEqual({
        channel: 'stable',
        installedCSV: 'rhods-operator.v2.19.0',
        packageName: 'rhods-operator',
        installPlanRefNamespace: 'redhat-ods-operator',
        lastUpdated: '2026-10-06T00:00:00Z',
        source: 'OLMv1',
        installed: true,
      });
    });

    it('should mark installed false when the Installed condition is not Succeeded', () => {
      const ce = makeClusterExtension({
        status: {
          conditions: [{ type: 'Installed', status: 'False', reason: 'Failed' }],
        },
      });
      expect(clusterExtensionToSubscriptionStatus(ce)).toEqual(
        expect.objectContaining({ source: 'OLMv1', installed: false, installedCSV: undefined }),
      );
    });

    it('should handle a ClusterExtension with no status yet', () => {
      const ce = makeClusterExtension({ status: undefined });
      expect(clusterExtensionToSubscriptionStatus(ce)).toEqual({
        channel: 'stable',
        installedCSV: undefined,
        packageName: 'rhods-operator',
        installPlanRefNamespace: 'redhat-ods-operator',
        lastUpdated: undefined,
        source: 'OLMv1',
        installed: false,
      });
    });
  });

  describe('getCSVForApp', () => {
    const appDef = { spec: { csvName: 'rhods-operator' } } as OdhApplication;
    const getNamespacedCustomObject = jest.fn();
    const mockFastify = {
      kube: { customObjectsApi: { getNamespacedCustomObject } },
    } as any;

    const mockSubscriptions = (subs: SubscriptionStatusData[]) =>
      jest.spyOn(resourceUtils, 'getSubscriptions').mockReturnValue(subs);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve undefined when the app has no csvName', async () => {
      mockSubscriptions([]);
      await expect(
        getCSVForApp(mockFastify, { spec: {} } as OdhApplication),
      ).resolves.toBeUndefined();
      expect(getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it('should return a synthesized CSV for an installed OLM v1 ClusterExtension without reading a CSV', async () => {
      mockSubscriptions([
        {
          installedCSV: 'rhods-operator.v2.19.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv1',
          installed: true,
        },
      ]);
      await expect(getCSVForApp(mockFastify, appDef)).resolves.toEqual({
        metadata: { name: 'rhods-operator.v2.19.0', namespace: 'redhat-ods-operator' },
      });
      expect(getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it('should match an installed OLM v1 extension by package name when the bundle name differs', async () => {
      mockSubscriptions([
        {
          installedCSV: 'some-unrelated-bundle.v1.0.0',
          packageName: 'rhods-operator',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv1',
          installed: true,
        },
      ]);
      await expect(getCSVForApp(mockFastify, appDef)).resolves.toEqual({
        metadata: { name: 'some-unrelated-bundle.v1.0.0', namespace: 'redhat-ods-operator' },
      });
      expect(getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it('should prefer an installed OLM v1 extension over a stale OLM v0 entry', async () => {
      mockSubscriptions([
        // Stale OLM v0 entry first in the merged list (no backing CSV).
        {
          installedCSV: 'rhods-operator.v2.18.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv0',
        },
        {
          installedCSV: 'rhods-operator.v2.19.0',
          packageName: 'rhods-operator',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv1',
          installed: true,
        },
      ]);
      await expect(getCSVForApp(mockFastify, appDef)).resolves.toEqual({
        metadata: { name: 'rhods-operator.v2.19.0', namespace: 'redhat-ods-operator' },
      });
      expect(getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it('should resolve undefined for an OLM v1 ClusterExtension that is not installed', async () => {
      mockSubscriptions([
        {
          installedCSV: 'rhods-operator.v2.19.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv1',
          installed: false,
        },
      ]);
      await expect(getCSVForApp(mockFastify, appDef)).resolves.toBeUndefined();
      expect(getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it('should read the ClusterServiceVersion for an OLM v0 subscription', async () => {
      mockSubscriptions([
        {
          installedCSV: 'rhods-operator.v2.19.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          source: 'OLMv0',
        },
      ]);
      getNamespacedCustomObject.mockResolvedValue({
        body: { metadata: { name: 'rhods-operator.v2.19.0' }, status: { phase: 'Succeeded' } },
      });
      await expect(getCSVForApp(mockFastify, appDef)).resolves.toEqual(
        expect.objectContaining({ status: { phase: 'Succeeded' } }),
      );
      expect(getNamespacedCustomObject).toHaveBeenCalledWith(
        'operators.coreos.com',
        'v1alpha1',
        'redhat-ods-operator',
        'clusterserviceversions',
        'rhods-operator.v2.19.0',
      );
    });
  });
});
