import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  buildSubjectRoleRows,
  SubjectRolesTableBase,
} from '#~/pages/projects/projectPermissions/SubjectRolesTable';
import SubjectRolesTableSection from '#~/pages/projects/projectPermissions/SubjectRolesTableSection';
import { OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE } from '#~/concepts/permissions/const';
import { KnownLabels } from '#~/k8sTypes';
import {
  mockGroupRoleBindingSubject,
  mockClusterRoleK8sResource,
  mockRoleBindingK8sResource,
  mockRoleK8sResource,
  mockUserRoleBindingSubject,
} from '#~/__mocks__';

describe('SubjectRolesTable', () => {
  const emptyFilterData = { name: '', role: '' };

  it('renders an empty state when there are no rows', () => {
    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={[]}
        emptyTableView={<div>No users have roles assigned.</div>}
      />,
    );

    expect(screen.getByText('No users have roles assigned.')).toBeInTheDocument();
  });

  it('renders role labels and rowSpan grouping, and splits rowSpan blocks after sorting', () => {
    const namespace = 'test-ns';
    const withDisplayName = <T extends { metadata: { annotations?: Record<string, string> } }>(
      resource: T,
      displayName: string,
    ): T => ({
      ...resource,
      metadata: {
        ...resource.metadata,
        annotations: {
          ...(resource.metadata.annotations ?? {}),
          'openshift.io/display-name': displayName,
        },
      },
    });

    const openshiftDefaultRole = withDisplayName(
      mockRoleK8sResource({
        name: 'role-a',
        namespace,
        labels: { 'kubernetes.io/bootstrapping': OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE },
      }),
      'Role A',
    );
    const dashboardRole = withDisplayName(
      mockRoleK8sResource({
        name: 'role-b',
        namespace,
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      }),
      'Role B',
    );
    const openshiftCustomRole1 = withDisplayName(
      mockRoleK8sResource({
        name: 'role-c',
        namespace,
        labels: { foo: 'bar' },
      }),
      'Role C',
    );
    const openshiftCustomRole2 = withDisplayName(
      mockRoleK8sResource({
        name: 'role-d',
        namespace,
        labels: { foo: 'bar' },
      }),
      'Role D',
    );

    const roles = [openshiftDefaultRole, dashboardRole, openshiftCustomRole1, openshiftCustomRole2];

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const user2 = mockUserRoleBindingSubject({ name: 'test-user-2' });
    const groupSubject = mockGroupRoleBindingSubject({ name: 'test-group-ignored' });

    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-a',
        subjects: [user1],
        creationTimestamp: '2024-01-01T00:00:00Z',
      }),
      mockRoleBindingK8sResource({
        name: 'rb-2',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-b',
        subjects: [user1],
        creationTimestamp: '2024-03-01T00:00:00Z',
      }),
      mockRoleBindingK8sResource({
        name: 'rb-3',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-c',
        subjects: [user2, groupSubject], // group subject ignored for user table rows
        creationTimestamp: '2024-02-01T00:00:00Z',
      }),
      mockRoleBindingK8sResource({
        name: 'rb-4',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-d',
        subjects: [user1],
        creationTimestamp: '2024-04-01T00:00:00Z',
      }),
    ];

    const rows = buildSubjectRoleRows('user', emptyFilterData, roles, [], roleBindings);

    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={rows}
        emptyTableView={<div>No users have roles assigned.</div>}
      />,
    );

    // Default sort (Name) -> test-user-1 rows are contiguous => one name cell with rowSpan=3
    const user1Cell = screen.getByText('test-user-1').closest('td');
    expect(user1Cell).toHaveAttribute('rowspan', '3');

    // Label behavior: OpenShift default/custom render, Dashboard renders no badge
    expect(screen.getByText('OpenShift default')).toBeInTheDocument();
    expect(screen.getAllByText('OpenShift custom')).toHaveLength(2);

    // Sort by Date created (asc) -> test-user-1 should split into 2 blocks around test-user-2
    // There are two "Date created" buttons in the header: the sort button and the help popover button
    // (aria-label: "Date created help"). Ensure we click the sort button.
    const dateSortButton = screen.getByRole('button', { name: /^date created$/i });
    fireEvent.click(dateSortButton);

    expect(screen.getAllByText('test-user-1')).toHaveLength(2);
  });

  it('filters rows by name and role (case-insensitive)', () => {
    const namespace = 'test-ns';

    const roleA = mockRoleK8sResource({ name: 'role-a', namespace, labels: { foo: 'bar' } });
    roleA.metadata.annotations = { 'openshift.io/display-name': 'Data Scientist' };
    const roleB = mockRoleK8sResource({ name: 'role-b', namespace, labels: { foo: 'bar' } });
    const clusterAdmin = mockClusterRoleK8sResource({ name: 'admin', labels: { foo: 'bar' } });

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const user2 = mockUserRoleBindingSubject({ name: 'test-user-2' });

    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-a',
        subjects: [user1],
      }),
      mockRoleBindingK8sResource({
        name: 'rb-2',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-b',
        subjects: [user2],
      }),
      mockRoleBindingK8sResource({
        name: 'rb-3',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [user1],
      }),
    ];

    const rowsByName = buildSubjectRoleRows(
      'user',
      { name: 'test-user-1', role: '' },
      [roleA, roleB],
      [],
      roleBindings,
    );
    // Name filter should match all test-user-1 rows (including ClusterRole bindings)
    expect(rowsByName).toHaveLength(2);
    expect(rowsByName.map((r) => r.subjectName)).toEqual(['test-user-1', 'test-user-1']);
    expect(rowsByName.map((r) => r.roleRef)).toEqual([
      { kind: 'Role', name: 'role-a' },
      { kind: 'ClusterRole', name: 'admin' },
    ]);

    const rowsByRole = buildSubjectRoleRows(
      'user',
      { name: '', role: 'data scI' },
      [roleA, roleB],
      [clusterAdmin],
      roleBindings,
    );
    expect(rowsByRole).toHaveLength(1);
    expect(rowsByRole[0].roleRef.name).toBe('role-a');

    // Friendly name mapping for well-known ClusterRoles (admin -> Admin)
    const rowsByRoleFriendly = buildSubjectRoleRows(
      'user',
      { name: '', role: 'adm' },
      [roleA, roleB],
      [clusterAdmin],
      roleBindings,
    );
    expect(rowsByRoleFriendly).toHaveLength(1);
    expect(rowsByRoleFriendly[0].roleRef).toEqual({ kind: 'ClusterRole', name: 'admin' });
  });

  it('calls onRoleClick when the role link is clicked', () => {
    const namespace = 'test-ns';
    const roleA = mockRoleK8sResource({ name: 'role-a', namespace, labels: { foo: 'bar' } });
    roleA.metadata.annotations = { 'openshift.io/display-name': 'Role A' };

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-a',
        subjects: [user1],
      }),
    ];

    const rows = buildSubjectRoleRows('user', emptyFilterData, [roleA], [], roleBindings);
    const onRoleClick = jest.fn();

    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={rows}
        emptyTableView={<div>No users have roles assigned.</div>}
        onRoleClick={onRoleClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Role A' }));
    expect(onRoleClick).toHaveBeenCalledWith({ kind: 'Role', name: 'role-a' });
  });

  it('renders friendly display names for well-known ClusterRoles (admin/edit)', () => {
    const namespace = 'test-ns';
    const clusterAdmin = mockClusterRoleK8sResource({ name: 'admin', labels: { foo: 'bar' } });
    const clusterEdit = mockClusterRoleK8sResource({ name: 'edit', labels: { foo: 'bar' } });
    const user1 = mockUserRoleBindingSubject({ name: 'test-user@redhat.com' });

    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [user1],
      }),
      mockRoleBindingK8sResource({
        name: 'rb-edit',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [user1],
      }),
    ];

    const rows = buildSubjectRoleRows(
      'user',
      emptyFilterData,
      [],
      [clusterAdmin, clusterEdit],
      roleBindings,
    );

    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={rows}
        emptyTableView={<div>No users have roles assigned.</div>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contributor' })).toBeInTheDocument();
  });

  it('renders "-" when role binding creation timestamp is missing', () => {
    const namespace = 'test-ns';
    const roleA = mockRoleK8sResource({ name: 'role-a', namespace, labels: { foo: 'bar' } });

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const rb = mockRoleBindingK8sResource({
      name: 'rb-1',
      namespace,
      roleRefKind: 'Role',
      roleRefName: 'role-a',
      subjects: [user1],
    });
    delete rb.metadata.creationTimestamp;

    const rows = buildSubjectRoleRows('user', emptyFilterData, [roleA], [], [rb]);

    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={rows}
        emptyTableView={<div>No users have roles assigned.</div>}
      />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders role metadata.name when openshift.io/display-name annotation is missing', () => {
    const namespace = 'test-ns';
    const roleA = mockRoleK8sResource({ name: 'role-a', namespace, labels: { foo: 'bar' } });
    // Ensure no display-name annotation is present
    delete roleA.metadata.annotations;

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-a',
        subjects: [user1],
      }),
    ];

    const rows = buildSubjectRoleRows('user', emptyFilterData, [roleA], [], roleBindings);

    render(
      <SubjectRolesTableBase
        ariaLabel="Users roles table"
        testId="permissions-user-roles-table"
        rows={rows}
        emptyTableView={<div>No users have roles assigned.</div>}
      />,
    );

    expect(screen.getByRole('button', { name: 'role-a' })).toBeInTheDocument();
  });

  it('builds group rows when subjectKind="group"', () => {
    const namespace = 'test-ns';
    const roleA = mockRoleK8sResource({ name: 'role-a', namespace, labels: { foo: 'bar' } });

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-ignored' });
    const group1 = mockGroupRoleBindingSubject({ name: 'test-group-1' });

    const roleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'role-a',
        subjects: [user1, group1],
      }),
    ];

    const rows = buildSubjectRoleRows('group', emptyFilterData, [roleA], [], roleBindings);
    expect(rows).toHaveLength(1);
    expect(rows[0].subjectName).toBe('test-group-1');
  });

  it('does not render when section isVisible is false', () => {
    render(
      <SubjectRolesTableSection
        subjectKind="user"
        filterData={emptyFilterData}
        onClearFilters={jest.fn()}
        isVisible={false}
      />,
    );

    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-user-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-group-button')).not.toBeInTheDocument();
  });
});
