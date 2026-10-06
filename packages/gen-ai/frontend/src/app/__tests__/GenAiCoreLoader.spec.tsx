import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import GenAiCoreLoader from '~/app/GenAiCoreLoader';

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: function ApplicationsPageMock({
    children,
    loaded,
  }: {
    children: React.ReactNode;
    loaded: boolean;
  }) {
    return (
      <div data-testid="applications-page" data-loaded={loaded}>
        {children}
      </div>
    );
  },
}));

jest.mock('~/app/context/GenAiContext', () => ({
  GenAiContextProvider: function GenAiContextProviderMock({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  },
}));

jest.mock('../GenAiCoreHeader', () => ({
  __esModule: true,
  default: function GenAiCoreHeaderMock() {
    return <div />;
  },
}));
jest.mock('../GenAiCoreNoProjects', () => ({
  __esModule: true,
  default: function GenAiCoreNoProjectsMock() {
    return <div>No projects</div>;
  },
}));

const mockUseNamespaceSelectorWithPersistence = jest.mocked(useNamespaceSelectorWithPersistence);

const mockNamespaceSelectorReturn = (namespacesLoaded: boolean) =>
  ({
    namespaces: [],
    namespacesLoaded,
    preferredNamespace: undefined,
    updatePreferredNamespace: jest.fn(),
    clearStoredNamespace: jest.fn(),
    namespacesLoadError: undefined,
    initializationError: undefined,
  }) as ReturnType<typeof useNamespaceSelectorWithPersistence>;

const renderLoader = () =>
  render(
    <MemoryRouter initialEntries={['/assets']}>
      <Routes>
        <Route
          path="/assets"
          element={
            <GenAiCoreLoader
              allowNoProjects
              title="AI asset endpoints"
              getInvalidRedirectPath={(namespace) => `/assets/${namespace}`}
            />
          }
        >
          <Route index element={<div>AI Assets content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('GenAiCoreLoader', () => {
  it('waits for namespaces to load before rendering no-project content', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(mockNamespaceSelectorReturn(false));

    renderLoader();

    expect(screen.getByTestId('applications-page')).toHaveAttribute('data-loaded', 'false');
    expect(screen.queryByText('AI Assets content')).not.toBeInTheDocument();
  });

  it('renders no-project content after namespaces load with an empty list', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(mockNamespaceSelectorReturn(true));

    renderLoader();

    expect(screen.getByText('AI Assets content')).toBeInTheDocument();
  });
});
