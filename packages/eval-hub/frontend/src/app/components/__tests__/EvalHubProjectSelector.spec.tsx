import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as ModArchCore from 'mod-arch-core';
import EvalHubProjectSelector from '../EvalHubProjectSelector';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () => ({
  __esModule: true,
  default: ({
    onSelection,
    namespace,
    isLoading,
  }: {
    onSelection: (name: string) => void;
    namespace: string;
    isLoading: boolean;
  }) => (
    <div data-testid="project-selector">
      <span data-testid="selector-namespace">{namespace}</span>
      <span data-testid="selector-loading">{String(isLoading)}</span>
      <button data-testid="select-project" onClick={() => onSelection('new-project')}>
        Select
      </button>
    </div>
  ),
}));

const mockUseNamespaceSelector = jest.mocked(ModArchCore.useNamespaceSelector);

describe('EvalHubProjectSelector', () => {
  const mockGetRedirectPath = jest.fn((ns: string) => `/eval-hub/${ns}`);
  const mockUpdatePreferredNamespace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'project-a' }, { name: 'new-project' }],
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);
  });

  it('should render the project selector', () => {
    render(
      <MemoryRouter>
        <EvalHubProjectSelector namespace="project-a" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });

  it('should pass namespace to the selector', () => {
    render(
      <MemoryRouter>
        <EvalHubProjectSelector namespace="project-a" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('selector-namespace')).toHaveTextContent('project-a');
  });

  it('should pass empty string when namespace is undefined', () => {
    render(
      <MemoryRouter>
        <EvalHubProjectSelector getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('selector-namespace')).toHaveTextContent('');
  });

  it('should show loading state when namespaces are not loaded', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      namespacesLoaded: false,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    render(
      <MemoryRouter>
        <EvalHubProjectSelector namespace="project-a" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('selector-loading')).toHaveTextContent('true');
  });

  it('should navigate and update preferred namespace on selection', () => {
    render(
      <MemoryRouter>
        <EvalHubProjectSelector namespace="project-a" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('select-project'));

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith({ name: 'new-project' });
    expect(mockGetRedirectPath).toHaveBeenCalledWith('new-project');
    expect(mockNavigate).toHaveBeenCalledWith('/eval-hub/new-project');
  });
});
