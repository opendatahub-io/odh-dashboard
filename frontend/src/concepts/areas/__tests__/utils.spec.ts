import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { StackCapability, StackComponent, SupportedArea } from '~/concepts/areas/types';
import { SupportedAreasStateMap } from '~/concepts/areas/const';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { isAreaAvailable } from '~/concepts/areas/utils';

describe('isAreaAvailable', () => {
  describe('v1 Operator (deprecated)', () => {
    it('should enable component (flag true)', () => {
      const isAvailable = isAreaAvailable(
        SupportedArea.DS_PIPELINES,
        mockDashboardConfig({ disablePipelines: false }).spec,
        null,
        null,
      );

      expect(isAvailable.status).toBe(true);
      expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'on' });
      expect(isAvailable.reliantAreas).toBe(null);
      expect(isAvailable.requiredComponents).toBe(null);
    });

    it('should disable component (flag false)', () => {
      const isAvailable = isAreaAvailable(
        SupportedArea.DS_PIPELINES,
        mockDashboardConfig({ disablePipelines: true }).spec,
        null,
        null,
      );

      expect(isAvailable.status).not.toBe(true);
      expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'off' });
      expect(isAvailable.reliantAreas).toBe(null);
      expect(isAvailable.requiredComponents).toBe(null);
    });

    it('should enable area when not a feature flag component', () => {
      const isAvailable = isAreaAvailable(
        SupportedArea.WORKBENCHES,
        mockDashboardConfig({}).spec,
        null,
        null,
      );

      expect(isAvailable.status).toBe(true);
      expect(isAvailable.featureFlags).toBe(null);
      expect(isAvailable.reliantAreas).toEqual({ [SupportedArea.DS_PROJECTS_VIEW]: true });
      expect(isAvailable.requiredComponents).toBe(null);
    });
  });

  describe('v2 Operator', () => {
    describe('flags and cluster states', () => {
      it('should enable area (flag true, cluster true)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.DS_PIPELINES,
          mockDashboardConfig({ disablePipelines: false }).spec,
          mockDscStatus({ installedComponents: { [StackComponent.DS_PIPELINES]: true } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).toBe(true);
        expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'on' });
        expect(isAvailable.reliantAreas).toBe(null);
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.DS_PIPELINES]: true });
      });

      it('should disable area (flag true, cluster false)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.DS_PIPELINES,
          mockDashboardConfig({ disablePipelines: false }).spec,
          mockDscStatus({ installedComponents: { [StackComponent.DS_PIPELINES]: false } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).not.toBe(true);
        expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'on' });
        expect(isAvailable.reliantAreas).toBe(null);
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.DS_PIPELINES]: false });
      });

      it('should disable area (flag false, cluster true)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.DS_PIPELINES,
          mockDashboardConfig({ disablePipelines: true }).spec,
          mockDscStatus({ installedComponents: { [StackComponent.DS_PIPELINES]: true } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).not.toBe(true);
        expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'off' });
        expect(isAvailable.reliantAreas).toBe(null);
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.DS_PIPELINES]: true });
      });

      it('should disable area (flag false, cluster false)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.DS_PIPELINES,
          mockDashboardConfig({ disablePipelines: true }).spec,
          mockDscStatus({ installedComponents: { [StackComponent.DS_PIPELINES]: false } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).not.toBe(true);
        expect(isAvailable.featureFlags).toEqual({ disablePipelines: 'off' });
        expect(isAvailable.reliantAreas).toBe(null);
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.DS_PIPELINES]: false });
      });

      it('should enable area (no flag, cluster true)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.WORKBENCHES,
          mockDashboardConfig({}).spec,
          mockDscStatus({ installedComponents: { [StackComponent.WORKBENCHES]: true } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).toBe(true);
        expect(isAvailable.featureFlags).toBe(null);
        expect(isAvailable.reliantAreas).toEqual({ [SupportedArea.DS_PROJECTS_VIEW]: true });
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.WORKBENCHES]: true });
      });

      it('should disable area (no flag, cluster false)', () => {
        const isAvailable = isAreaAvailable(
          SupportedArea.WORKBENCHES,
          mockDashboardConfig({}).spec,
          mockDscStatus({ installedComponents: { [StackComponent.WORKBENCHES]: false } }),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).not.toBe(true);
        expect(isAvailable.featureFlags).toBe(null);
        expect(isAvailable.reliantAreas).toEqual({ [SupportedArea.DS_PROJECTS_VIEW]: true });
        expect(isAvailable.requiredComponents).toEqual({ [StackComponent.WORKBENCHES]: false });
      });
    });

    /**
     * These tests rely on Custom Serving Runtime being in a specific configuration, we may need to replace
     * these tests if these become obsolete.
     */
    describe('reliantAreas', () => {
      it('should enable area if at least one reliant area is enabled', () => {
        // Make sure this test is valid
        expect(SupportedAreasStateMap[SupportedArea.CUSTOM_RUNTIMES].reliantAreas).toEqual([
          SupportedArea.MODEL_SERVING,
        ]);

        // Test both reliant areas
        const isAvailableReliantCustomRuntimes = isAreaAvailable(
          SupportedArea.CUSTOM_RUNTIMES,
          mockDashboardConfig({ disableModelServing: false }).spec,
          mockDscStatus({}),
          mockDsciStatus({}),
        );

        expect(isAvailableReliantCustomRuntimes.status).toBe(true);
        expect(isAvailableReliantCustomRuntimes.featureFlags).toEqual({
          disableCustomServingRuntimes: 'on',
        });
        expect(isAvailableReliantCustomRuntimes.reliantAreas).toEqual({
          [SupportedArea.MODEL_SERVING]: true,
        });
        expect(isAvailableReliantCustomRuntimes.requiredComponents).toBe(null);
      });

      it('should disable area if reliant areas are all disabled', () => {
        // Make sure this test is valid
        expect(SupportedAreasStateMap[SupportedArea.CUSTOM_RUNTIMES].reliantAreas).toEqual([
          SupportedArea.MODEL_SERVING,
        ]);

        // Test areas disabled
        const isAvailable = isAreaAvailable(
          SupportedArea.CUSTOM_RUNTIMES,
          mockDashboardConfig({ disableModelServing: true }).spec,
          mockDscStatus({}),
          mockDsciStatus({}),
        );

        expect(isAvailable.status).not.toBe(true);
        expect(isAvailable.featureFlags).toEqual({ disableCustomServingRuntimes: 'on' });
        expect(isAvailable.reliantAreas).toEqual({
          [SupportedArea.MODEL_SERVING]: false,
        });
        expect(isAvailable.requiredComponents).toBe(null);
      });
    });

    describe('requiredCapabilities', () => {
      it('should enable area if both capabilities are enabled', () => {
        // Make sure this test is valid
        expect(SupportedAreasStateMap[SupportedArea.K_SERVE_AUTH].requiredCapabilities).toEqual([
          StackCapability.SERVICE_MESH,
          StackCapability.SERVICE_MESH_AUTHZ,
        ]);

        // Test both reliant areas
        const isAvailableKserveAuth = isAreaAvailable(
          SupportedArea.K_SERVE_AUTH,
          mockDashboardConfig({ disableKServeAuth: false }).spec,
          mockDscStatus({
            installedComponents: {
              [StackComponent.K_SERVE]: true,
            },
          }),
          mockDsciStatus({
            requiredCapabilities: [
              StackCapability.SERVICE_MESH,
              StackCapability.SERVICE_MESH_AUTHZ,
            ],
          }),
        );

        expect(isAvailableKserveAuth.status).toBe(true);
        expect(isAvailableKserveAuth.featureFlags).toEqual({
          disableKServeAuth: 'on',
        });
        expect(isAvailableKserveAuth.requiredCapabilities).toEqual({
          [StackCapability.SERVICE_MESH]: true,
          [StackCapability.SERVICE_MESH_AUTHZ]: true,
        });
      });

      it('should enable area if one capability is missing', () => {
        // Make sure this test is valid
        expect(SupportedAreasStateMap[SupportedArea.K_SERVE_AUTH].requiredCapabilities).toEqual([
          StackCapability.SERVICE_MESH,
          StackCapability.SERVICE_MESH_AUTHZ,
        ]);

        // Test both reliant areas
        const isAvailableKserveAuth = isAreaAvailable(
          SupportedArea.K_SERVE_AUTH,
          mockDashboardConfig({ disableKServeAuth: false }).spec,
          mockDscStatus({
            installedComponents: {
              [StackComponent.K_SERVE]: true,
            },
          }),
          mockDsciStatus({
            requiredCapabilities: [StackCapability.SERVICE_MESH],
          }),
        );

        expect(isAvailableKserveAuth.status).toBe(false);
        expect(isAvailableKserveAuth.featureFlags).toEqual({
          disableKServeAuth: 'on',
        });
        expect(isAvailableKserveAuth.requiredCapabilities).toEqual({
          [StackCapability.SERVICE_MESH]: true,
          [StackCapability.SERVICE_MESH_AUTHZ]: false,
        });
      });
    });
  });
});
