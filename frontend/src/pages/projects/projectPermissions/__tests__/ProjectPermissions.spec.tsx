import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SubjectScopeFilter } from '#~/pages/projects/projectPermissions/const';
import ProjectPermissions from '#~/pages/projects/projectPermissions/ProjectPermissions';

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => ({ loaded: true, error: undefined }),
}));

jest.mock('#~/pages/projects/projectPermissions/SubjectRolesTableSection', () => ({
  __esModule: true,
  default: ({ subjectKind }: { subjectKind: 'user' | 'group' }) => (
    <div data-testid={`mock-subject-roles-section-${subjectKind}`} />
  ),
}));

jest.mock('#~/components/SimpleSelect', () => ({
  __esModule: true,
  default: ({
    options,
    value,
    onChange,
    'data-testid': dataTestId,
  }: {
    options: { key: string; label: string }[];
    value: string;
    onChange: (key: string) => void;
    'data-testid'?: string;
  }) => (
    <select data-testid={dataTestId} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('#~/components/FilterToolbar', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-filter-toolbar" />,
}));

describe('ProjectPermissions', () => {
  it('shows/hides Users and Groups sections based on subject scope', () => {
    render(<ProjectPermissions />);

    // default scope = all => show both
    expect(screen.getByTestId('mock-subject-roles-section-user')).toBeInTheDocument();
    expect(screen.getByTestId('mock-subject-roles-section-group')).toBeInTheDocument();

    // scope = users => hide groups
    fireEvent.change(screen.getByTestId('permissions-subject-scope-dropdown'), {
      target: { value: SubjectScopeFilter.user },
    });
    expect(screen.getByTestId('mock-subject-roles-section-user')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-subject-roles-section-group')).not.toBeInTheDocument();

    // scope = groups => hide users
    fireEvent.change(screen.getByTestId('permissions-subject-scope-dropdown'), {
      target: { value: SubjectScopeFilter.group },
    });
    expect(screen.queryByTestId('mock-subject-roles-section-user')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-subject-roles-section-group')).toBeInTheDocument();
  });
});
