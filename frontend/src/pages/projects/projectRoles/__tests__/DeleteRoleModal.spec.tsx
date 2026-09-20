import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockRoleK8sResource, mockRoleBindingK8sResource } from '#~/__mocks__';
import { deleteRole } from '#~/api/k8s/roles';
import DeleteRoleModal from '#~/pages/projects/projectRoles/DeleteRoleModal';
import type { RoleListRow } from '#~/pages/projects/projectRoles/types';

jest.mock('#~/api/k8s/roles', () => ({
  deleteRole: jest.fn(),
}));

const mockDeleteRole = jest.mocked(deleteRole);

const mockRoleBindingsData = jest.fn();

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    roleBindings: { data: mockRoleBindingsData() },
  }),
}));

const dashboardRole = mockRoleK8sResource({
  name: 'my-custom-role',
  namespace: 'test-ns',
  labels: { 'opendatahub.io/dashboard': 'true' },
});

const row: RoleListRow = {
  key: 'Role:my-custom-role',
  roleRef: { kind: 'Role', name: 'my-custom-role' },
  role: dashboardRole,
  userLabels: {},
};

describe('DeleteRoleModal', () => {
  beforeEach(() => {
    mockRoleBindingsData.mockReturnValue([]);
    mockDeleteRole.mockResolvedValue({ kind: 'Status', status: 'Success' } as never);
  });

  it('should render with correct title and body when no bindings reference the role', () => {
    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);
    expect(screen.getByText('Delete role?')).toBeInTheDocument();
    expect(screen.getByText(/will be deleted\./)).toBeInTheDocument();
  });

  it('should show unassignment text when role has bindings with multiple subjects', () => {
    mockRoleBindingsData.mockReturnValue([
      mockRoleBindingK8sResource({
        name: 'binding-1',
        namespace: 'test-ns',
        roleRefName: 'my-custom-role',
        roleRefKind: 'Role',
        subjects: [
          { kind: 'User', name: 'user-a', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'Group', name: 'group-b', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      }),
    ]);

    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);
    expect(screen.getByText(/will be deleted and unassigned from/)).toBeInTheDocument();
    expect(screen.getByText(/2 users or groups/)).toBeInTheDocument();
  });

  it('should show singular text for one affected subject', () => {
    mockRoleBindingsData.mockReturnValue([
      mockRoleBindingK8sResource({
        name: 'binding-1',
        namespace: 'test-ns',
        roleRefName: 'my-custom-role',
        roleRefKind: 'Role',
        subjects: [{ kind: 'User', name: 'user-a', apiGroup: 'rbac.authorization.k8s.io' }],
      }),
    ]);

    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);
    expect(screen.getByText(/will be deleted and unassigned from/)).toBeInTheDocument();
    expect(screen.getByText(/1 user or group/)).toBeInTheDocument();
  });

  it('should not count bindings referencing a different role', () => {
    mockRoleBindingsData.mockReturnValue([
      mockRoleBindingK8sResource({
        name: 'binding-other',
        namespace: 'test-ns',
        roleRefName: 'some-other-role',
        roleRefKind: 'Role',
        subjects: [{ kind: 'User', name: 'user-x', apiGroup: 'rbac.authorization.k8s.io' }],
      }),
    ]);

    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);
    expect(screen.getByText(/will be deleted\./)).toBeInTheDocument();
    expect(screen.queryByText(/unassigned from/)).not.toBeInTheDocument();
  });

  it('should require typing the role name to enable the delete button', () => {
    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);
    const deleteButton = screen.getByRole('button', { name: 'Delete role' });
    expect(deleteButton).toBeDisabled();

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'my-custom-role' } });
    expect(deleteButton).toBeEnabled();
  });

  it('should call deleteRole and onClose(true) on successful deletion', async () => {
    const onClose = jest.fn();
    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={onClose} />);

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'my-custom-role' } });

    const deleteButton = screen.getByRole('button', { name: 'Delete role' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteRole).toHaveBeenCalledWith('my-custom-role', 'test-ns');
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });

  it('should display error when deletion fails', async () => {
    mockDeleteRole.mockRejectedValue(new Error('Forbidden'));
    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={jest.fn()} />);

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'my-custom-role' } });

    const deleteButton = screen.getByRole('button', { name: 'Delete role' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });
  });

  it('should call onClose(false) when cancel is clicked', () => {
    const onClose = jest.fn();
    render(<DeleteRoleModal row={row} namespace="test-ns" onClose={onClose} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledWith(false);
  });
});
