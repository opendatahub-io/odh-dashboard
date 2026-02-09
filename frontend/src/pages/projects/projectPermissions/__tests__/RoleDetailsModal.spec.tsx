import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { RoleRef } from '#~/concepts/permissions/types';
import {
  mockClusterRoleK8sResource,
  mockGroupRoleBindingSubject,
  mockRoleBindingK8sResource,
  mockUserRoleBindingSubject,
} from '#~/__mocks__';
import RoleDetailsModal from '#~/pages/projects/projectPermissions/roleDetails/RoleDetailsModal';

const mockUsePermissionsContext = jest.fn();

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => mockUsePermissionsContext(),
}));

describe('RoleDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show default admin/edit description in the modal header', () => {
    const roleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
    const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });

    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [clusterRole] },
      roleBindings: { data: [] },
    });

    render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

    expect(screen.getByText('Edit the project and manage user access')).toBeInTheDocument();
  });

  it('should render rules with View more pagination', () => {
    const roleRef: RoleRef = { kind: 'ClusterRole', name: 'custom-pipeline-super-user' };
    const rules = new Array(12).fill(0).map((_, i) => ({
      verbs: ['get', 'list'],
      apiGroups: [`group-${i}`],
      resources: ['foos'],
      resourceNames: i % 2 === 0 ? [`name-${i}`] : undefined,
    }));
    const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name, rules });

    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [clusterRole] },
      roleBindings: { data: [] },
    });

    render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

    const table = screen.getByTestId('role-rules-table');
    expect(within(table).getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();

    expect(table.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(screen.getByText('Showing 10/12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View more/i }));
    expect(table.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(screen.getByText('Showing 12/12')).toBeInTheDocument();
  });

  it('should support sorting by API Groups, Resource type, and Resource names', () => {
    const roleRef: RoleRef = { kind: 'ClusterRole', name: 'sortable-role' };
    const rules = [
      { verbs: ['get'], apiGroups: ['z-group'], resources: ['b-res'], resourceNames: ['b-name'] },
      { verbs: ['get'], apiGroups: ['a-group'], resources: ['a-res'], resourceNames: ['a-name'] },
    ];
    const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name, rules });

    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [clusterRole] },
      roleBindings: { data: [] },
    });

    render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

    // Header helper popovers are PatternFly affordances; avoid asserting their presence.

    const table = screen.getByTestId('role-rules-table');
    const getFirstBodyRow = () => {
      const rows = within(table).getAllByRole('row');
      const bodyRows = rows.filter((r) => r.closest('tbody'));
      if (bodyRows.length === 0) {
        throw new Error('Expected at least one tbody row');
      }
      return bodyRows[0];
    };

    // Sort by API Groups ascending
    const apiGroupsHeader = within(table).getByRole('columnheader', { name: /API Groups/i });
    fireEvent.click(within(apiGroupsHeader).getByRole('button', { name: /API Groups/i }));
    expect(within(getFirstBodyRow()).getByText('a-group')).toBeInTheDocument();

    // Sort by Resource type ascending
    const resourcesHeader = within(table).getByRole('columnheader', { name: /Resource type/i });
    fireEvent.click(within(resourcesHeader).getByRole('button', { name: /Resource type/i }));
    expect(within(getFirstBodyRow()).getByText('a-res')).toBeInTheDocument();

    // Sort by Resource names ascending
    const resourceNamesHeader = within(table).getByRole('columnheader', {
      name: /Resource names/i,
    });
    fireEvent.click(within(resourceNamesHeader).getByRole('button', { name: /^Resource names$/i }));
    expect(within(getFirstBodyRow()).getByText('a-name')).toBeInTheDocument();
  });

  it('should show an access-needed empty state for unreadable roles, but still show assignees', () => {
    const roleRef: RoleRef = { kind: 'ClusterRole', name: 'view' };
    const rb = mockRoleBindingK8sResource({
      name: 'rb-view',
      namespace: 'test-ns',
      roleRefKind: roleRef.kind,
      roleRefName: roleRef.name,
      subjects: [
        mockUserRoleBindingSubject({ name: 'test-user-1' }),
        mockGroupRoleBindingSubject({ name: 'test-group-1' }),
      ],
    });

    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [] }, // role details unavailable
      roleBindings: { data: [rb] },
    });

    render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

    expect(screen.getByText('No view access')).toBeInTheDocument();
    // When access is denied, the whole Role details tab is locked.
    expect(screen.queryByText('Role name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Assignees/i }));
    expect(screen.getByRole('tab', { name: /Assignees/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('role-assignees-table')).toBeInTheDocument();
    expect(screen.getByText('test-user-1')).toBeInTheDocument();
    expect(screen.getByText('test-group-1')).toBeInTheDocument();
  });
});
