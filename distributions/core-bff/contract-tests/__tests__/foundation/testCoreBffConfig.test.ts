/**
 * @jest-environment node
 */
import { ApiTestResultError } from '@odh-dashboard/contract-tests';
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectSuccess,
  expectError,
} from '../helpers';

describe('Core BFF Config Endpoints', () => {
  describe('Config Endpoint', () => {
    it('should return merged dashboard config', async () => {
      const result = await apiClient.get('/api/config');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/DashboardConfig',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const body = response.data as {
        apiVersion: string;
        kind: string;
        spec: { dashboardConfig: Record<string, unknown> };
      };
      expect(body.apiVersion).toBe('opendatahub.io/v1alpha');
      expect(body.kind).toBe('OdhDashboardConfig');
      expect(body.spec.dashboardConfig).toHaveProperty('enablement');
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/config'), 401);
    });

    it('should return config for non-admin authenticated user', async () => {
      expectSuccess(await restrictedClient.get('/api/config'));
    });
  });

  describe('Components Endpoint', () => {
    it('should return an array (empty when CRD is absent)', async () => {
      const result = await apiClient.get('/api/components');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ComponentsResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/components'), 401);
    });

    it('should return components for non-admin authenticated user', async () => {
      const { response } = expectSuccess(await restrictedClient.get('/api/components'));
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Components Remove', () => {
    it('should return 401 for non-admin', async () => {
      expectError(await restrictedClient.get('/api/components/remove?appName=test'), 401);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/components/remove?appName=test'), 401);
    });
  });

  describe('DashboardConfig By Name Endpoint', () => {
    it('should return 401 for non-admin user on GET', async () => {
      expectError(
        await restrictedClient.get('/api/dashboardConfig/opendatahub/odh-dashboard-config'),
        401,
      );
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.get('/api/dashboardConfig/opendatahub/odh-dashboard-config'),
        401,
      );
    });

    it('should not reject admin with 401 or 403', async () => {
      const result = await apiClient.get('/api/dashboardConfig/opendatahub/odh-dashboard-config');
      const status = result.success
        ? result.response.status
        : (result as ApiTestResultError).error.status;
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('should return 404 when CRD is absent in mock mode', async () => {
      expectError(
        await apiClient.get('/api/dashboardConfig/opendatahub/odh-dashboard-config'),
        404,
      );
    });
  });

  describe('Config PATCH', () => {
    it('should return 401 for non-admin on PATCH', async () => {
      expectError(await restrictedClient.patch('/api/config', { spec: {} }), 401);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.patch('/api/config', { spec: {} }), 401);
    });
  });

  describe('DashboardConfig PATCH', () => {
    it('should return 401 for non-admin on PATCH', async () => {
      expectError(
        await restrictedClient.patch('/api/dashboardConfig/opendatahub/odh-dashboard-config', [
          { op: 'replace', path: '/spec/dashboardConfig/enablement', value: true },
        ]),
        401,
      );
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.patch('/api/dashboardConfig/opendatahub/odh-dashboard-config', [
          { op: 'replace', path: '/spec/dashboardConfig/enablement', value: true },
        ]),
        401,
      );
    });
  });

  describe('Cluster Settings Endpoint', () => {
    it('should return cluster settings', async () => {
      const result = await apiClient.get('/api/cluster-settings');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/ClusterSettings',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const body = response.data as Record<string, unknown>;
      expect(body).toHaveProperty('pvcSize');
      expect(body).toHaveProperty('cullerTimeout');
      expect(body).toHaveProperty('modelServingPlatformEnabled');
    });

    it('should reject invalid PUT with 400', async () => {
      expectError(
        await apiClient.put('/api/cluster-settings', {
          pvcSize: -1,
          cullerTimeout: 0,
          userTrackingEnabled: false,
          modelServingPlatformEnabled: { kServe: true, LLMd: true },
        }),
        400,
      );
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/cluster-settings'), 401);
    });

    it('should return 401 for non-admin on GET', async () => {
      expectError(await restrictedClient.get('/api/cluster-settings'), 401);
    });

    it('should return 401 for non-admin on PUT', async () => {
      expectError(
        await restrictedClient.put('/api/cluster-settings', {
          pvcSize: 20,
          cullerTimeout: 600,
          userTrackingEnabled: false,
          modelServingPlatformEnabled: { kServe: true, LLMd: true },
        }),
        401,
      );
    });
  });
});
