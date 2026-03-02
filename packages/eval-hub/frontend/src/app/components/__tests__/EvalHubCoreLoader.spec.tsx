import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as ModArchCore from 'mod-arch-core';
import EvalHubCoreLoader from '../EvalHubCoreLoader';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () =>
  require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
);

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

jest.mock('../EvalHubProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

const mockUseNamespaceSelector = jest.mocked(ModArchCore.useNamespaceSelector);

const renderWithRouter = (path: string, getInvalidRedirectPath: (ns: string) => string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={<EvalHubCoreLoader getInvalidRedirectPath={getInvalidRedirectPath} />}
        >
          <Route
            path=":namespace"
            element={<div data-testid="outlet-content">Outlet rendered</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('EvalHubCoreLoader', () => {
  const mockGetRedirectPath = (ns: string) => `/${ns}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show no projects state when namespaces array is empty', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('eval-hub-no-projects')).toBeInTheDocument();
  });

  it('should redirect to preferred namespace when no namespace param is set', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      namespacesLoaded: true,
      preferredNamespace: { name: 'project-b' },
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('should redirect to first namespace when no preferred namespace exists', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'project-a' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('should render Outlet when a valid namespace is selected', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'my-project' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/my-project', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toHaveTextContent('Outlet rendered');
  });

  it('should show invalid project state for an unrecognized namespace', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'real-project' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/bad-project', mockGetRedirectPath);

    expect(screen.getByTestId('eval-hub-invalid-project')).toBeInTheDocument();
  });
});
