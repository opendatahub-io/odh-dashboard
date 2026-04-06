import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ASSIGNMENT_STATUS_COLUMN_INDEX,
  manageRolesColumns,
} from '#~/pages/projects/projectPermissions/manageRoles/columns';

describe('manageRolesColumns', () => {
  it('should expose the assignment status column index', () => {
    expect(ASSIGNMENT_STATUS_COLUMN_INDEX).toBe(4);
    expect(manageRolesColumns[ASSIGNMENT_STATUS_COLUMN_INDEX].label).toBe('Assignment status');
  });

  it('should render role type help text without the legacy introduction', () => {
    const roleTypeColumn = manageRolesColumns.find(({ field }) => field === 'roleType');

    expect(roleTypeColumn?.info?.ariaLabel).toBe('Role type help');

    render(<>{roleTypeColumn?.info?.popover}</>);

    expect(screen.getByText('AI roles')).toBeInTheDocument();
    expect(screen.getByText('OpenShift default roles')).toBeInTheDocument();
    expect(screen.getByText('OpenShift custom roles')).toBeInTheDocument();
    expect(
      screen.queryByText(/Roles with different labels come from different intentions/i),
    ).not.toBeInTheDocument();
  });

  it('should render assignment status help text without the legacy introduction', () => {
    const assignmentStatusColumn = manageRolesColumns[ASSIGNMENT_STATUS_COLUMN_INDEX];

    expect(assignmentStatusColumn.info?.ariaLabel).toBe('Assignment status help');

    render(<>{assignmentStatusColumn.info?.popover}</>);

    expect(screen.getByText('Assigned:')).toBeInTheDocument();
    expect(screen.getByText('Assigning:')).toBeInTheDocument();
    expect(screen.getByText('Unassigning:')).toBeInTheDocument();
    expect(screen.queryByText(/A role can have three possible statuses/i)).not.toBeInTheDocument();
  });
});
