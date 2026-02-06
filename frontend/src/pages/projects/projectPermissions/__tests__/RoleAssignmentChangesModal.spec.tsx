import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mockClusterRoleK8sResource } from '#~/__mocks__';
import { KnownLabels } from '#~/k8sTypes';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ManageRolesRow } from '#~/pages/projects/projectPermissions/manageRoles/columns';
import type { RoleAssignmentChanges } from '#~/pages/projects/projectPermissions/manageRoles/types';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';
import RoleAssignmentChangesModal from '#~/pages/projects/projectPermissions/manageRoles/confirmModal/RoleAssignmentChangesModal';

// Helper to create ManageRolesRow for testing
const createRow = (
  roleRef: RoleRef,
  displayName: string,
  options?: { isDashboard?: boolean; isDefault?: boolean },
): ManageRolesRow => {
  const { isDashboard = false, isDefault = false } = options ?? {};

  // Create role object for AI roles (dashboard-labeled or default roles)
  const role =
    isDashboard || isDefault
      ? mockClusterRoleK8sResource({
          name: roleRef.name,
          labels: isDashboard ? { [KnownLabels.DASHBOARD_RESOURCE]: 'true' } : undefined,
        })
      : undefined;

  return {
    roleRef,
    displayName,
    statusLabel: AssignmentStatus.CurrentlyAssigned,
    role,
  };
};

// Common roleRefs for testing
const adminRoleRef: RoleRef = { kind: 'ClusterRole', name: 'admin' };
const contributorRoleRef: RoleRef = { kind: 'ClusterRole', name: 'edit' };
const dashboardRoleRef: RoleRef = { kind: 'ClusterRole', name: 'ds-pipeline-user' };
const customRoleRef: RoleRef = { kind: 'Role', name: 'custom-role' };

describe('RoleAssignmentChangesModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Modal display', () => {
    it('should render modal with correct title and subject name', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText('Confirm role assignment changes?')).toBeInTheDocument();
      expect(screen.getByText('test-user')).toBeInTheDocument();
    });

    it('should display correct count for single role assignment', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText('1 role')).toBeInTheDocument();
      expect(screen.getByText(/will be newly assigned/)).toBeInTheDocument();
    });

    it('should display correct count for multiple role assignments (plural)', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [
          createRow(adminRoleRef, 'Admin', { isDefault: true }),
          createRow(contributorRoleRef, 'Contributor', { isDefault: true }),
        ],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText('2 roles')).toBeInTheDocument();
    });

    it('should display correct count for single role unassignment', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText('1 role')).toBeInTheDocument();
      expect(screen.getByText(/will be unassigned/)).toBeInTheDocument();
    });

    it('should display both assigning and unassigning counts with "and"', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [
          createRow(contributorRoleRef, 'Contributor', { isDefault: true }),
          createRow(dashboardRoleRef, 'Pipeline User', { isDashboard: true }),
        ],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText(/will be newly assigned/)).toBeInTheDocument();
      // The "and" is in the same text node, check the full text contains both
      expect(
        screen.getByText(/will be newly assigned and.*will be unassigned/),
      ).toBeInTheDocument();
    });
  });

  describe('Role sections', () => {
    it('should render assigning section when there are roles to assign', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByTestId('assign-roles-confirm-assigning-section')).toBeInTheDocument();
      expect(screen.getByText('Assigning roles')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render unassigning section when there are roles to unassign', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(contributorRoleRef, 'Contributor', { isDefault: true })],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByTestId('assign-roles-confirm-unassigning-section')).toBeInTheDocument();
      expect(screen.getByText('Unassigning roles')).toBeInTheDocument();
      expect(screen.getByText('Contributor')).toBeInTheDocument();
    });

    it('should not render assigning section when empty', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(
        screen.queryByTestId('assign-roles-confirm-assigning-section'),
      ).not.toBeInTheDocument();
    });

    it('should not render unassigning section when empty', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(
        screen.queryByTestId('assign-roles-confirm-unassigning-section'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Custom role warning', () => {
    it('should show warning when unassigning custom (non-AI) roles', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(customRoleRef, 'Custom Role')], // No role object = custom role
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByTestId('assign-roles-confirm-custom-role-warning')).toBeInTheDocument();
      expect(
        screen.getByText(/The OpenShift custom roles were assigned from OpenShift/),
      ).toBeInTheDocument();
    });

    it('should not show warning when unassigning only AI roles (default roles)', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(
        screen.queryByTestId('assign-roles-confirm-custom-role-warning'),
      ).not.toBeInTheDocument();
    });

    it('should not show warning when unassigning only dashboard-labeled roles', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(dashboardRoleRef, 'Pipeline User', { isDashboard: true })],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(
        screen.queryByTestId('assign-roles-confirm-custom-role-warning'),
      ).not.toBeInTheDocument();
    });

    it('should show warning when unassigning mix of AI and custom roles', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [
          createRow(adminRoleRef, 'Admin', { isDefault: true }),
          createRow(customRoleRef, 'Custom Role'), // Custom role triggers warning
        ],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByTestId('assign-roles-confirm-custom-role-warning')).toBeInTheDocument();
    });

    it('should not show warning when only assigning roles (no unassignments)', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(customRoleRef, 'Custom Role')], // Assigning custom role - no warning
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(
        screen.queryByTestId('assign-roles-confirm-custom-role-warning'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Button interactions', () => {
    it('should call onClose when Cancel button is clicked', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm button is clicked', async () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable buttons while saving', async () => {
      // Make onConfirm hang to simulate loading state
      mockOnConfirm.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 1000);
          }),
      );

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-save')).toBeDisabled();
        expect(screen.getByTestId('assign-roles-confirm-cancel')).toBeDisabled();
      });
    });

    it('should hide close button while saving', async () => {
      // Make onConfirm hang to simulate loading state
      mockOnConfirm.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 1000);
          }),
      );

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      // Close button should be visible before saving
      expect(screen.getByLabelText('Close')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-save')).toBeDisabled();
      });

      // Close button should be hidden while saving (onClose is undefined)
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error alert when onConfirm fails with Error', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Network error'));

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display generic error message when onConfirm fails with non-Error', async () => {
      mockOnConfirm.mockRejectedValue('string error');

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-error')).toBeInTheDocument();
      });

      // The error alert title is "Failed to save role assignments"
      // and the body contains the generic message
      const errorAlert = screen.getByTestId('assign-roles-confirm-error');
      expect(errorAlert).toHaveTextContent('Failed to save role assignments');
    });

    it('should re-enable buttons after error', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Network error'));

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-error')).toBeInTheDocument();
      });

      // Buttons should be re-enabled after error
      expect(screen.getByTestId('assign-roles-confirm-save')).not.toBeDisabled();
      expect(screen.getByTestId('assign-roles-confirm-cancel')).not.toBeDisabled();
    });

    it('should clear error on retry', async () => {
      mockOnConfirm.mockRejectedValueOnce(new Error('First error'));
      mockOnConfirm.mockResolvedValueOnce(undefined);

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      // First attempt - fails
      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.getByTestId('assign-roles-confirm-error')).toBeInTheDocument();
      });

      // Second attempt - error should be cleared during save
      fireEvent.click(screen.getByTestId('assign-roles-confirm-save'));

      await waitFor(() => {
        expect(screen.queryByTestId('assign-roles-confirm-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty subject name', () => {
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName=""
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      // Modal should still render
      expect(screen.getByText('Confirm role assignment changes?')).toBeInTheDocument();
    });

    it('should handle long subject name', () => {
      const longName = 'a'.repeat(100);
      const changes: RoleAssignmentChanges = {
        assigning: [createRow(adminRoleRef, 'Admin', { isDefault: true })],
        unassigning: [],
      };

      render(
        <RoleAssignmentChangesModal
          subjectName={longName}
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle many roles in both sections', () => {
      const manyAssigning: ManageRolesRow[] = Array.from({ length: 10 }, (_, i) =>
        createRow({ kind: 'ClusterRole', name: `role-assign-${i}` }, `Assign Role ${i}`, {
          isDashboard: true,
        }),
      );
      const manyUnassigning: ManageRolesRow[] = Array.from({ length: 5 }, (_, i) =>
        createRow({ kind: 'ClusterRole', name: `role-unassign-${i}` }, `Unassign Role ${i}`, {
          isDashboard: true,
        }),
      );

      const changes: RoleAssignmentChanges = {
        assigning: manyAssigning,
        unassigning: manyUnassigning,
      };

      render(
        <RoleAssignmentChangesModal
          subjectName="test-user"
          changes={changes}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      // Check description contains correct counts
      expect(screen.getByText('10 roles')).toBeInTheDocument();
      expect(screen.getByText('5 roles')).toBeInTheDocument();

      // Check roles are listed
      expect(screen.getByText('Assign Role 0')).toBeInTheDocument();
      expect(screen.getByText('Assign Role 9')).toBeInTheDocument();
      expect(screen.getByText('Unassign Role 0')).toBeInTheDocument();
      expect(screen.getByText('Unassign Role 4')).toBeInTheDocument();
    });
  });
});
