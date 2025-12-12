import type { DashboardResource } from '@perses-dev/core';
import {
  filterDashboards,
  buildDashboardUrl,
  getDashboardDisplayName,
  BASE_PATH,
  DASHBOARD_QUERY_PARAM,
} from '../dashboardUtils';

// Helper to create mock DashboardResource objects
const createMockDashboard = (name: string, displayName?: string): DashboardResource =>
  ({
    metadata: { name },
    spec: {
      display: displayName ? { name: displayName } : undefined,
    },
  } as DashboardResource);

describe('dashboardUtils', () => {
  describe('filterDashboards', () => {
    describe('prefix filtering', () => {
      it('should include dashboards starting with "dashboard-" prefix', () => {
        const dashboards = [
          createMockDashboard('dashboard-model'),
          createMockDashboard('dashboard-cluster'),
        ];

        const result = filterDashboards(dashboards, false);

        expect(result).toHaveLength(2);
        expect(result.map((d) => d.metadata.name)).toEqual([
          'dashboard-cluster',
          'dashboard-model',
        ]);
      });

      it('should exclude dashboards not starting with "dashboard-" prefix', () => {
        const dashboards = [
          createMockDashboard('dashboard-model'),
          createMockDashboard('other-dashboard'),
          createMockDashboard('my-dashboard-test'),
          createMockDashboard('metrics-panel'),
        ];

        const result = filterDashboards(dashboards, false);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.name).toBe('dashboard-model');
      });

      it('should return empty array when no dashboards match the prefix', () => {
        const dashboards = [
          createMockDashboard('other-dashboard'),
          createMockDashboard('metrics-panel'),
        ];

        const result = filterDashboards(dashboards, false);

        expect(result).toHaveLength(0);
      });

      it('should handle empty dashboard array', () => {
        const result = filterDashboards([], false);

        expect(result).toHaveLength(0);
      });
    });

    describe('admin suffix filtering', () => {
      it('should exclude admin dashboards for non-admin users', () => {
        const dashboards = [
          createMockDashboard('dashboard-model'),
          createMockDashboard('dashboard-cluster-admin'),
          createMockDashboard('dashboard-settings-admin'),
        ];

        const result = filterDashboards(dashboards, false);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.name).toBe('dashboard-model');
      });

      it('should include admin dashboards for admin users', () => {
        const dashboards = [
          createMockDashboard('dashboard-model'),
          createMockDashboard('dashboard-cluster-admin'),
          createMockDashboard('dashboard-settings-admin'),
        ];

        const result = filterDashboards(dashboards, true);

        expect(result).toHaveLength(3);
        expect(result.map((d) => d.metadata.name)).toEqual([
          'dashboard-cluster-admin',
          'dashboard-model',
          'dashboard-settings-admin',
        ]);
      });

      it('should only match exact "-admin" suffix', () => {
        const dashboards = [
          createMockDashboard('dashboard-admin-panel'), // has "admin" but not as suffix
          createMockDashboard('dashboard-administrator'), // similar but not exact suffix
          createMockDashboard('dashboard-metrics-admin'), // exact suffix
        ];

        const result = filterDashboards(dashboards, false);

        expect(result).toHaveLength(2);
        expect(result.map((d) => d.metadata.name)).toEqual([
          'dashboard-admin-panel',
          'dashboard-administrator',
        ]);
      });
    });

    describe('sorting', () => {
      it('should sort dashboards lexicographically by metadata.name', () => {
        const dashboards = [
          createMockDashboard('dashboard-zebra'),
          createMockDashboard('dashboard-alpha'),
          createMockDashboard('dashboard-model'),
          createMockDashboard('dashboard-1-cluster'),
        ];

        const result = filterDashboards(dashboards, false);

        expect(result.map((d) => d.metadata.name)).toEqual([
          'dashboard-1-cluster',
          'dashboard-alpha',
          'dashboard-model',
          'dashboard-zebra',
        ]);
      });

      it('should sort numbers correctly (lexicographic, not numeric)', () => {
        const dashboards = [
          createMockDashboard('dashboard-10'),
          createMockDashboard('dashboard-2'),
          createMockDashboard('dashboard-1'),
        ];

        const result = filterDashboards(dashboards, false);

        // Lexicographic: "1" < "10" < "2"
        expect(result.map((d) => d.metadata.name)).toEqual([
          'dashboard-1',
          'dashboard-10',
          'dashboard-2',
        ]);
      });
    });

    describe('combined filtering and sorting', () => {
      it('should filter by prefix, filter by admin status, and sort results', () => {
        const dashboards = [
          createMockDashboard('dashboard-zebra'),
          createMockDashboard('other-panel'),
          createMockDashboard('dashboard-alpha-admin'),
          createMockDashboard('dashboard-model'),
          createMockDashboard('metrics-dashboard'),
          createMockDashboard('dashboard-cluster-admin'),
        ];

        const nonAdminResult = filterDashboards(dashboards, false);
        expect(nonAdminResult.map((d) => d.metadata.name)).toEqual([
          'dashboard-model',
          'dashboard-zebra',
        ]);

        const adminResult = filterDashboards(dashboards, true);
        expect(adminResult.map((d) => d.metadata.name)).toEqual([
          'dashboard-alpha-admin',
          'dashboard-cluster-admin',
          'dashboard-model',
          'dashboard-zebra',
        ]);
      });
    });
  });

  describe('buildDashboardUrl', () => {
    describe('with project name', () => {
      it('should build URL with project name and dashboard name', () => {
        const result = buildDashboardUrl('my-project', 'dashboard-model');

        expect(result).toBe(`${BASE_PATH}/my-project?${DASHBOARD_QUERY_PARAM}=dashboard-model`);
      });

      it('should encode special characters in project name', () => {
        const result = buildDashboardUrl('my project/with&special', 'dashboard-model');

        expect(result).toBe(
          `${BASE_PATH}/my%20project%2Fwith%26special?${DASHBOARD_QUERY_PARAM}=dashboard-model`,
        );
      });

      it('should encode special characters in dashboard name', () => {
        const result = buildDashboardUrl('my-project', 'dashboard name&special');

        expect(result).toBe(
          `${BASE_PATH}/my-project?${DASHBOARD_QUERY_PARAM}=dashboard%20name%26special`,
        );
      });

      it('should encode both project and dashboard names with special characters', () => {
        const result = buildDashboardUrl('project/1', 'dashboard?2');

        expect(result).toBe(`${BASE_PATH}/project%2F1?${DASHBOARD_QUERY_PARAM}=dashboard%3F2`);
      });
    });

    describe('without project name (All projects)', () => {
      it('should build URL with base path and dashboard query param for empty project name', () => {
        const result = buildDashboardUrl('', 'dashboard-cluster');

        expect(result).toBe(`${BASE_PATH}?${DASHBOARD_QUERY_PARAM}=dashboard-cluster`);
      });
    });
  });

  describe('getDashboardDisplayName', () => {
    it('should return display name when available', () => {
      const dashboard = createMockDashboard('dashboard-model', 'Model Dashboard');

      const result = getDashboardDisplayName(dashboard);

      expect(result).toBe('Model Dashboard');
    });

    it('should fall back to metadata name when display name is not set', () => {
      const dashboard = createMockDashboard('dashboard-cluster');

      const result = getDashboardDisplayName(dashboard);

      expect(result).toBe('dashboard-cluster');
    });

    it('should fall back to metadata name when display name is empty string', () => {
      const dashboard = createMockDashboard('dashboard-metrics', '');

      const result = getDashboardDisplayName(dashboard);

      expect(result).toBe('dashboard-metrics');
    });
  });
});
