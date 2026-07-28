import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockRoleK8sResource } from '#~/__mocks__';
import { getRole } from '#~/api';
import DuplicateRolePage from '#~/pages/projects/projectRoles/DuplicateRolePage';

jest.mock('#~/api', () => ({
  getRole: jest.fn(),
}));

jest.mock('../CreateRolePage', () => {
  const Mock = (props: {
    duplicateRole?: { metadata: { name: string; annotations?: Record<string, string> } };
  }) => (
    <div data-testid="mock-create-role-page">
      {props.duplicateRole && (
        <>
          <span data-testid="duplicate-role-name">{props.duplicateRole.metadata.name}</span>
          <span data-testid="duplicate-role-display-name">
            {props.duplicateRole.metadata.annotations?.['openshift.io/display-name']}
          </span>
        </>
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

const sourceRole = mockRoleK8sResource({
  name: 'my-custom-role',
  namespace: 'test-project',
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [{ verbs: ['get', 'list'], apiGroups: ['apps'], resources: ['deployments'] }],
});

const renderDuplicatePage = (roleName = 'my-custom-role', namespace = 'test-project') =>
  render(
    <MemoryRouter initialEntries={[`/projects/${namespace}/roles/${roleName}/duplicate`]}>
      <Routes>
        <Route
          path="/projects/:namespace/roles/:roleName/duplicate"
          element={<DuplicateRolePage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('DuplicateRolePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner while fetching source role', () => {
    mockGetRole.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    renderDuplicatePage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should pre-populate display name with "Copy of" prefix', async () => {
    mockGetRole.mockResolvedValue(sourceRole);
    renderDuplicatePage();

    await waitFor(() => {
      expect(screen.getByTestId('mock-create-role-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('duplicate-role-display-name')).toHaveTextContent(
      'Copy of my-custom-role',
    );
  });

  it('should clear metadata.name in duplicate role', async () => {
    mockGetRole.mockResolvedValue(sourceRole);
    renderDuplicatePage();

    await waitFor(() => {
      expect(screen.getByTestId('mock-create-role-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('duplicate-role-name')).toHaveTextContent('');
  });

  it('should show error state when source role returns 404', async () => {
    mockGetRole.mockRejectedValue(new Error('Not Found'));
    renderDuplicatePage('non-existent-role');

    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Unable to load role')).toBeInTheDocument();
  });
});
