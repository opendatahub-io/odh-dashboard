import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useNamespaceSelector } from 'mod-arch-core';
import MainPage from '~/app/pages/MainPage';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ProjectObjectType: { connections: 'connections' },
  TitleWithIcon: ({ title }: { title: React.ReactNode }) => <>{title}</>,
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () => {
  const ProjectSelector = ({
    namespace,
    onSelection,
  }: {
    namespace: string;
    onSelection: (projectName: string) => void;
  }) => (
    <>
      <span data-testid="selected-project">{namespace}</span>
      <button type="button" data-testid="select-project-2" onClick={() => onSelection('project-2')}>
        Select project 2
      </button>
    </>
  );

  return { __esModule: true, default: ProjectSelector };
});

jest.mock('~/app/components/ApplicationsPage', () => {
  const ApplicationsPage = ({
    title,
    headerContent,
    children,
    empty,
    emptyMessage,
    loadError,
    loaded,
  }: {
    title: React.ReactNode;
    headerContent: React.ReactNode;
    children: React.ReactNode;
    empty?: boolean;
    emptyMessage?: string;
    loadError?: Error;
    loaded: boolean;
  }) => (
    <div>
      <div data-testid="page-title">{title}</div>
      <div data-testid="page-header">{headerContent}</div>
      <div data-testid="page-state">
        {loadError
          ? `error:${loadError.message}`
          : !loaded
            ? 'loading'
            : empty
              ? `empty:${emptyMessage}`
              : 'content'}
      </div>
      {children}
    </div>
  );

  return { __esModule: true, default: ApplicationsPage };
});

const mockUseNamespaceSelector = jest.mocked(useNamespaceSelector);
const projects = [
  { name: 'project-1', displayName: 'Project 1' },
  { name: 'project-2', displayName: 'Project 2' },
];

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

const renderPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/ai-hub/connections/*" element={<MainPage basePath="/ai-hub/connections" />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('MainPage', () => {
  const updatePreferredNamespace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: projects,
      preferredNamespace: projects[0],
      updatePreferredNamespace,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      initializationError: undefined,
      clearStoredNamespace: jest.fn(),
    });
  });

  it('should redirect the base route to the connection types tab', async () => {
    renderPage('/ai-hub/connections');

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe(
        '/ai-hub/connections/connection-types?project=project-1',
      );
    });
  });

  it('should switch tabs while preserving the selected project', async () => {
    const user = userEvent.setup();
    renderPage('/ai-hub/connections/connection-types?project=project-1');

    await user.click(screen.getByTestId('tab-connections'));

    expect(screen.getByTestId('location').textContent).toBe(
      '/ai-hub/connections/connections?project=project-1',
    );
  });

  it('should update the project query parameter when a project is selected', async () => {
    const user = userEvent.setup();
    renderPage('/ai-hub/connections/connection-types?project=project-1');

    await user.click(screen.getByTestId('select-project-2'));

    expect(screen.getByTestId('location').textContent).toBe(
      '/ai-hub/connections/connection-types?project=project-2',
    );
    expect(updatePreferredNamespace).toHaveBeenCalledWith(projects[1]);
  });

  it('should fall back when the preferred project is no longer available', async () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: projects,
      preferredNamespace: { name: 'deleted-project', displayName: 'Deleted project' },
      updatePreferredNamespace,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      initializationError: undefined,
      clearStoredNamespace: jest.fn(),
    });

    renderPage('/ai-hub/connections/connection-types');

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe(
        '/ai-hub/connections/connection-types?project=project-1',
      );
    });
    expect(updatePreferredNamespace).toHaveBeenCalledWith(projects[0]);
  });

  it('should show the loading state while projects are loading', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace,
      namespacesLoaded: false,
      namespacesLoadError: undefined,
      initializationError: undefined,
      clearStoredNamespace: jest.fn(),
    });

    renderPage('/ai-hub/connections/connection-types');

    expect(screen.getByTestId('page-state').textContent).toBe('loading');
  });

  it('should show the error state when projects fail to load', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace,
      namespacesLoaded: false,
      namespacesLoadError: new Error('Unauthorized'),
      initializationError: undefined,
      clearStoredNamespace: jest.fn(),
    });

    renderPage('/ai-hub/connections/connection-types');

    expect(screen.getByTestId('page-state').textContent).toBe('error:Unauthorized');
  });

  it('should show the empty state when no projects are available', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      initializationError: undefined,
      clearStoredNamespace: jest.fn(),
    });

    renderPage('/ai-hub/connections/connection-types');

    expect(screen.getByTestId('page-state').textContent).toBe('empty:No projects available');
  });
});
