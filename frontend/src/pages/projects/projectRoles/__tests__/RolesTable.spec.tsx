import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockRoleK8sResource, mockClusterRoleK8sResource } from '#~/__mocks__';
import RolesTable from '#~/pages/projects/projectRoles/RolesTable';
import type { RoleListRow } from '#~/pages/projects/projectRoles/types';

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

jest.mock('#~/pages/projects/projectPermissions/roleDetails/RoleDetailsModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockRoleDetailsModal';
  return Mock;
});

jest.mock('../PreviewYAMLModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockPreviewYAMLModal';
  return Mock;
});

const dashboardRole = mockRoleK8sResource({
  name: 'dashboard-custom',
  namespace: 'test-ns',
  labels: { 'opendatahub.io/dashboard': 'true' },
});

const adminClusterRole = mockClusterRoleK8sResource({
  name: 'admin',
  labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
});

const editClusterRole = mockClusterRoleK8sResource({
  name: 'edit',
  labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
});

const dashboardClusterRole = mockClusterRoleK8sResource({
  name: 'dashboard-cr',
  labels: { 'opendatahub.io/dashboard': 'true' },
});

const defaultRows: RoleListRow[] = [
  {
    key: 'Role:dashboard-custom',
    roleRef: { kind: 'Role', name: 'dashboard-custom' },
    role: dashboardRole,
    userLabels: {},
  },
  {
    key: 'ClusterRole:admin',
    roleRef: { kind: 'ClusterRole', name: 'admin' },
    role: adminClusterRole,
    userLabels: {},
  },
  {
    key: 'ClusterRole:edit',
    roleRef: { kind: 'ClusterRole', name: 'edit' },
    role: editClusterRole,
    userLabels: {},
  },
  {
    key: 'ClusterRole:dashboard-cr',
    roleRef: { kind: 'ClusterRole', name: 'dashboard-cr' },
    role: dashboardClusterRole,
    userLabels: {},
  },
];

const renderTable = (props: Partial<React.ComponentProps<typeof RolesTable>> = {}) =>
  render(
    <MemoryRouter>
      <RolesTable
        rows={defaultRows}
        namespace="test-ns"
        searchFilter=""
        onSearchChange={jest.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe('RolesTable', () => {
  it('should render rows for all provided roles', () => {
    renderTable();
    expect(screen.getByTestId('roles-table')).toBeInTheDocument();
    expect(screen.getByText('dashboard-custom')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Contributor')).toBeInTheDocument();
    expect(screen.getByText('dashboard-cr')).toBeInTheDocument();
  });

  it('should show AI role badge for dashboard-labeled and default roles', () => {
    renderTable();
    expect(screen.getAllByText('AI role')).toHaveLength(4);
  });

  it('should show OpenShift default role badge on admin and edit cluster roles', () => {
    renderTable();
    expect(screen.getAllByText('OpenShift default role')).toHaveLength(2);
  });

  it('should show Cluster role badge on ClusterRole entries', () => {
    renderTable();
    expect(screen.getAllByText('Cluster role')).toHaveLength(3);
  });

  it('should display user-defined label values as chips', () => {
    const labeledRole = mockRoleK8sResource({
      name: 'labeled-role',
      namespace: 'test-ns',
      labels: {
        'opendatahub.io/dashboard': 'true',
        'labels.opendatahub.io/team': 'platform',
        'labels.opendatahub.io/env': 'production',
      },
    });

    const rows: RoleListRow[] = [
      {
        key: 'Role:labeled-role',
        roleRef: { kind: 'Role', name: 'labeled-role' },
        role: labeledRole,
        userLabels: { team: 'platform', env: 'production' },
      },
    ];

    renderTable({ rows });
    expect(screen.getByTestId('role-label-team')).toHaveTextContent('platform');
    expect(screen.getByTestId('role-label-env')).toHaveTextContent('production');
  });

  it('should show dash when role has no user-defined labels', () => {
    renderTable({ rows: [defaultRows[0]] });
    expect(screen.getByTestId('role-labels-cell')).toHaveTextContent('-');
  });

  it('should render empty state when rows is empty', () => {
    renderTable({ rows: [] });
    expect(screen.getByTestId('no-roles-empty-state')).toBeInTheDocument();
  });

  it('should show Create custom role button in empty state', () => {
    renderTable({ rows: [] });
    expect(screen.getByTestId('create-role-button')).toBeInTheDocument();
  });
});
