import { testHook } from '@odh-dashboard/jest-config/hooks';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import { mockRoleK8sResource, mockClusterRoleK8sResource } from '#~/__mocks__';
import useRoleListData from '#~/pages/projects/projectRoles/useRoleListData';

describe('useRoleListData', () => {
  const dashboardRole = mockRoleK8sResource({
    name: 'my-dashboard-role',
    labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
  });

  const nonDashboardRole = mockRoleK8sResource({
    name: 'random-role',
    labels: { foo: 'bar' },
  });

  const dashboardClusterRole = mockClusterRoleK8sResource({
    name: 'my-dashboard-cr',
    labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
  });

  const adminClusterRole = mockClusterRoleK8sResource({
    name: 'admin',
    labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
  });

  const editClusterRole = mockClusterRoleK8sResource({
    name: 'edit',
    labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
  });

  const unrelatedClusterRole = mockClusterRoleK8sResource({
    name: 'view',
    labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
  });

  it('should include dashboard-labeled roles', () => {
    const renderResult = testHook(useRoleListData)([dashboardRole, nonDashboardRole], [], '');
    const keys = renderResult.result.current.map((r) => r.key);
    expect(keys).toEqual(['Role:my-dashboard-role']);
  });

  it('should include dashboard-labeled cluster roles', () => {
    const renderResult = testHook(useRoleListData)([], [dashboardClusterRole], '');
    const keys = renderResult.result.current.map((r) => r.key);
    expect(keys).toEqual(['ClusterRole:my-dashboard-cr']);
  });

  it('should include default cluster roles (admin, edit)', () => {
    const renderResult = testHook(useRoleListData)([], [adminClusterRole, editClusterRole], '');
    const keys = renderResult.result.current.map((r) => r.key);
    expect(keys).toEqual(['ClusterRole:admin', 'ClusterRole:edit']);
  });

  it('should exclude non-dashboard, non-default cluster roles', () => {
    const renderResult = testHook(useRoleListData)(
      [],
      [adminClusterRole, unrelatedClusterRole],
      '',
    );
    const keys = renderResult.result.current.map((r) => r.key);
    expect(keys).toEqual(['ClusterRole:admin']);
  });

  it('should combine dashboard roles and default cluster roles', () => {
    const renderResult = testHook(useRoleListData)(
      [dashboardRole],
      [adminClusterRole, editClusterRole, dashboardClusterRole],
      '',
    );
    const keys = renderResult.result.current.map((r) => r.key);
    expect(keys).toEqual([
      'Role:my-dashboard-role',
      'ClusterRole:admin',
      'ClusterRole:edit',
      'ClusterRole:my-dashboard-cr',
    ]);
  });

  it('should return empty array when no roles match', () => {
    const renderResult = testHook(useRoleListData)([nonDashboardRole], [unrelatedClusterRole], '');
    expect(renderResult.result.current).toEqual([]);
  });

  describe('search filtering', () => {
    it('should filter by display name', () => {
      const renderResult = testHook(useRoleListData)(
        [dashboardRole],
        [adminClusterRole, editClusterRole],
        'Admin',
      );
      const keys = renderResult.result.current.map((r) => r.key);
      expect(keys).toEqual(['ClusterRole:admin']);
    });

    it('should filter by description', () => {
      const renderResult = testHook(useRoleListData)(
        [],
        [adminClusterRole, editClusterRole],
        'manage user access',
      );
      const keys = renderResult.result.current.map((r) => r.key);
      expect(keys).toEqual(['ClusterRole:admin']);
    });

    it('should be case-insensitive', () => {
      const renderResult = testHook(useRoleListData)(
        [],
        [adminClusterRole, editClusterRole],
        'CONTRIBUTOR',
      );
      const keys = renderResult.result.current.map((r) => r.key);
      expect(keys).toEqual(['ClusterRole:edit']);
    });

    it('should trim whitespace from search', () => {
      const renderResult = testHook(useRoleListData)(
        [],
        [adminClusterRole, editClusterRole],
        '  Admin  ',
      );
      const keys = renderResult.result.current.map((r) => r.key);
      expect(keys).toEqual(['ClusterRole:admin']);
    });

    it('should return all rows when search is empty or whitespace', () => {
      const renderResult = testHook(useRoleListData)([dashboardRole], [adminClusterRole], '   ');
      expect(renderResult.result.current).toHaveLength(2);
    });
  });

  it('should set correct roleRef kind for roles vs cluster roles', () => {
    const renderResult = testHook(useRoleListData)([dashboardRole], [adminClusterRole], '');
    const rows = renderResult.result.current;
    expect(rows[0].roleRef).toEqual({ kind: 'Role', name: 'my-dashboard-role' });
    expect(rows[1].roleRef).toEqual({ kind: 'ClusterRole', name: 'admin' });
  });

  it('should attach the original role object to each row', () => {
    const renderResult = testHook(useRoleListData)([dashboardRole], [adminClusterRole], '');
    const rows = renderResult.result.current;
    expect(rows[0].role).toBe(dashboardRole);
    expect(rows[1].role).toBe(adminClusterRole);
  });

  it('should update results when inputs change', () => {
    const renderResult = testHook(useRoleListData)([dashboardRole], [adminClusterRole], '');
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(renderResult.result.current).toHaveLength(2);

    renderResult.rerender([dashboardRole], [adminClusterRole], 'Admin');
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult.result.current).toHaveLength(1);
    expect(renderResult.result.current[0].key).toBe('ClusterRole:admin');
  });
});
