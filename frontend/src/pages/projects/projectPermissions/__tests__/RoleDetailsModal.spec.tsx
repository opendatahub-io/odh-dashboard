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

const switchToAssigneesTab = () => {
  fireEvent.click(screen.getByRole('tab', { name: /Assignees/i }));
};

const getTableBodyRows = (testId: string) => {
  const table = screen.getByTestId(testId);
  // getAllByRole('row') returns both thead and tbody rows; the first is the header
  const allRows = within(table).getAllByRole('row');
  return allRows.slice(1);
};

describe('RoleDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal header', () => {
    it('should show default admin description in the modal header', () => {
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
  });

  describe('Role details tab', () => {
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

      expect(getTableBodyRows('role-rules-table')).toHaveLength(10);
      expect(screen.getByText('Showing 10/12')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /View more/i }));
      expect(getTableBodyRows('role-rules-table')).toHaveLength(12);
      expect(screen.getByText('Showing 12/12')).toBeInTheDocument();
    });

    it('should support sorting by API Groups, Resource type, and Resource names', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'sortable-role' };
      const rules = [
        {
          verbs: ['get'],
          apiGroups: ['z-group'],
          resources: ['b-res'],
          resourceNames: ['b-name'],
        },
        {
          verbs: ['get'],
          apiGroups: ['a-group'],
          resources: ['a-res'],
          resourceNames: ['a-name'],
        },
      ];
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name, rules });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

      const table = screen.getByTestId('role-rules-table');

      // Sort by API Groups ascending
      const apiGroupsHeader = within(table).getByRole('columnheader', { name: /API Groups/i });
      fireEvent.click(within(apiGroupsHeader).getByRole('button', { name: /API Groups/i }));
      expect(
        within(getTableBodyRows('role-rules-table')[0]).getByText('a-group'),
      ).toBeInTheDocument();

      // Sort by Resource type ascending
      const resourcesHeader = within(table).getByRole('columnheader', { name: /Resource type/i });
      fireEvent.click(within(resourcesHeader).getByRole('button', { name: /Resource type/i }));
      expect(
        within(getTableBodyRows('role-rules-table')[0]).getByText('a-res'),
      ).toBeInTheDocument();

      // Sort by Resource names ascending
      const resourceNamesHeader = within(table).getByRole('columnheader', {
        name: /Resource names/i,
      });
      fireEvent.click(
        within(resourceNamesHeader).getByRole('button', { name: /^Resource names$/i }),
      );
      expect(
        within(getTableBodyRows('role-rules-table')[0]).getByText('a-name'),
      ).toBeInTheDocument();
    });

    it('should show an access-denied empty state when role is not readable', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'view' };

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: [] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);

      expect(screen.getByText('No view access')).toBeInTheDocument();
      expect(screen.queryByText('Role name')).not.toBeInTheDocument();
    });
  });

  describe('Assignees tab', () => {
    it('should show assignees table with correct columns when assignees exist', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });
      const rb = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace: 'test-ns',
        roleRefKind: roleRef.kind,
        roleRefName: roleRef.name,
        subjects: [
          mockUserRoleBindingSubject({ name: 'alice' }),
          mockGroupRoleBindingSubject({ name: 'dev-team' }),
        ],
      });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [rb] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      const table = screen.getByTestId('role-assignees-table');
      expect(within(table).getByRole('columnheader', { name: /^Subject$/i })).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Subject kind/i }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Role binding/i }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Date created/i }),
      ).toBeInTheDocument();

      expect(within(table).getByText('alice')).toBeInTheDocument();
      expect(within(table).getByText('dev-team')).toBeInTheDocument();
    });

    it('should show empty state when no assignees exist', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      expect(screen.getByTestId('role-details-assignees-empty')).toBeInTheDocument();
      expect(screen.getByText('No assignees')).toBeInTheDocument();
      expect(screen.getByText('No users or groups have this role assigned.')).toBeInTheDocument();
    });

    it('should still show assignees when role details are unavailable', () => {
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
        clusterRoles: { data: [] },
        roleBindings: { data: [rb] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      expect(screen.getByRole('tab', { name: /Assignees/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByTestId('role-assignees-table')).toBeInTheDocument();
      expect(screen.getByText('test-user-1')).toBeInTheDocument();
      expect(screen.getByText('test-group-1')).toBeInTheDocument();
    });

    it('should only show assignees for the matching roleRef', () => {
      const adminRoleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
      const editRoleRef: RoleRef = { kind: 'ClusterRole', name: 'edit' };
      const adminClusterRole = mockClusterRoleK8sResource({ name: adminRoleRef.name });

      const rbAdmin = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace: 'test-ns',
        roleRefKind: adminRoleRef.kind,
        roleRefName: adminRoleRef.name,
        subjects: [mockUserRoleBindingSubject({ name: 'admin-user' })],
      });
      const rbEdit = mockRoleBindingK8sResource({
        name: 'rb-edit',
        namespace: 'test-ns',
        roleRefKind: editRoleRef.kind,
        roleRefName: editRoleRef.name,
        subjects: [mockUserRoleBindingSubject({ name: 'edit-user' })],
      });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [adminClusterRole] },
        roleBindings: { data: [rbAdmin, rbEdit] },
      });

      render(<RoleDetailsModal roleRef={adminRoleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      expect(screen.getByText('admin-user')).toBeInTheDocument();
      expect(screen.queryByText('edit-user')).not.toBeInTheDocument();
    });

    it('should support sorting assignees by Subject', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'edit' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });
      const rb = mockRoleBindingK8sResource({
        name: 'rb-edit',
        namespace: 'test-ns',
        roleRefKind: roleRef.kind,
        roleRefName: roleRef.name,
        subjects: [
          mockUserRoleBindingSubject({ name: 'zoe' }),
          mockUserRoleBindingSubject({ name: 'alice' }),
        ],
      });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [rb] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      const table = screen.getByTestId('role-assignees-table');
      const subjectHeader = within(table).getByRole('columnheader', { name: /^Subject$/i });
      fireEvent.click(within(subjectHeader).getByRole('button', { name: /^Subject$/i }));

      expect(
        within(getTableBodyRows('role-assignees-table')[0]).getByText('alice'),
      ).toBeInTheDocument();
    });

    it('should support sorting assignees by Subject kind', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'edit' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });
      const rb = mockRoleBindingK8sResource({
        name: 'rb-edit',
        namespace: 'test-ns',
        roleRefKind: roleRef.kind,
        roleRefName: roleRef.name,
        subjects: [
          mockUserRoleBindingSubject({ name: 'user-1' }),
          mockGroupRoleBindingSubject({ name: 'group-1' }),
        ],
      });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [rb] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      const table = screen.getByTestId('role-assignees-table');
      const kindHeader = within(table).getByRole('columnheader', { name: /Subject kind/i });
      fireEvent.click(within(kindHeader).getByRole('button', { name: /Subject kind/i }));

      // Group comes before User alphabetically
      expect(
        within(getTableBodyRows('role-assignees-table')[0]).getByText('group-1'),
      ).toBeInTheDocument();
    });

    it('should support sorting assignees by Role binding', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'edit' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });
      const rb1 = mockRoleBindingK8sResource({
        name: 'z-rb',
        namespace: 'test-ns',
        roleRefKind: roleRef.kind,
        roleRefName: roleRef.name,
        subjects: [mockUserRoleBindingSubject({ name: 'user-z' })],
      });
      const rb2 = mockRoleBindingK8sResource({
        name: 'a-rb',
        namespace: 'test-ns',
        roleRefKind: roleRef.kind,
        roleRefName: roleRef.name,
        subjects: [mockUserRoleBindingSubject({ name: 'user-a' })],
      });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [rb1, rb2] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={() => undefined} />);
      switchToAssigneesTab();

      const table = screen.getByTestId('role-assignees-table');
      const rbHeader = within(table).getByRole('columnheader', { name: /Role binding/i });
      fireEvent.click(within(rbHeader).getByRole('button', { name: /Role binding/i }));

      expect(
        within(getTableBodyRows('role-assignees-table')[0]).getByText('a-rb'),
      ).toBeInTheDocument();
    });
  });

  describe('Tab state management', () => {
    it('should reset to the details tab when roleRef changes', () => {
      const roleRef1: RoleRef = { kind: 'ClusterRole', name: 'admin' };
      const roleRef2: RoleRef = { kind: 'ClusterRole', name: 'edit' };
      const clusterRole1 = mockClusterRoleK8sResource({ name: roleRef1.name });
      const clusterRole2 = mockClusterRoleK8sResource({ name: roleRef2.name });

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole1, clusterRole2] },
        roleBindings: { data: [] },
      });

      const { rerender } = render(
        <RoleDetailsModal roleRef={roleRef1} onClose={() => undefined} />,
      );

      switchToAssigneesTab();
      expect(screen.getByRole('tab', { name: /Assignees/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );

      rerender(<RoleDetailsModal roleRef={roleRef2} onClose={() => undefined} />);

      expect(screen.getByRole('tab', { name: /Role details/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('should call onClose when the modal is closed', () => {
      const roleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
      const clusterRole = mockClusterRoleK8sResource({ name: roleRef.name });
      const onClose = jest.fn();

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [clusterRole] },
        roleBindings: { data: [] },
      });

      render(<RoleDetailsModal roleRef={roleRef} onClose={onClose} />);

      const modal = screen.getByTestId('role-details-modal');
      fireEvent.click(within(modal).getByRole('button', { name: /Close/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
