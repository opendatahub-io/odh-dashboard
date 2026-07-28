import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockRoleK8sResource } from '#~/__mocks__';
import { getRole } from '#~/api';
import EditRolePage from '#~/pages/projects/projectRoles/EditRolePage';

jest.mock('#~/api', () => ({
  getRole: jest.fn(),
}));

jest.mock('../CreateRolePage', () => {
  const Mock = (props: { existingRole?: { metadata: { name: string } } }) => (
    <div data-testid="mock-create-role-page">
      {props.existingRole && (
        <span data-testid="existing-role-name">{props.existingRole.metadata.name}</span>
      )}
    </div>
  );
  Mock.displayName = 'MockCreateRolePage';
  return Mock;
});

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: (props: { errorMessage?: string }) => (
    <div data-testid="error-page">{props.errorMessage}</div>
  ),
}));

const mockGetRole = jest.mocked(getRole);

const existingRole = mockRoleK8sResource({
  name: 'my-custom-role',
  namespace: 'test-project',
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [{ verbs: ['get', 'list'], apiGroups: [''], resources: ['pods'] }],
});

const renderEditPage = (roleName = 'my-custom-role', namespace = 'test-project') =>
  render(
    <MemoryRouter initialEntries={[`/projects/${namespace}/roles/${roleName}/edit`]}>
      <Routes>
        <Route path="/projects/:namespace/roles/:roleName/edit" element={<EditRolePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('EditRolePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner while fetching role', () => {
    mockGetRole.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    renderEditPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should pass existing role to CreateRolePage on successful fetch', async () => {
    mockGetRole.mockResolvedValue(existingRole);
    renderEditPage();

    await waitFor(() => {
      expect(screen.getByTestId('mock-create-role-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('existing-role-name')).toHaveTextContent('my-custom-role');
    expect(mockGetRole).toHaveBeenCalledWith('test-project', 'my-custom-role');
  });

  it('should show error state when role fetch returns 404', async () => {
    mockGetRole.mockRejectedValue(new Error('Not Found'));
    renderEditPage('non-existent-role');

    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Unable to load role')).toBeInTheDocument();
  });
});
