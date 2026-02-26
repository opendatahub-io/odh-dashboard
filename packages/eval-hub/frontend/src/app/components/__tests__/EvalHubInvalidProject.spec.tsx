import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvalHubInvalidProject from '../EvalHubInvalidProject';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-project' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

describe('EvalHubInvalidProject', () => {
  const mockGetRedirectPath = jest.fn((ns: string) => `/eval-hub/${ns}`);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the invalid project empty state', () => {
    render(
      <MemoryRouter>
        <EvalHubInvalidProject namespace="bad-project" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('eval-hub-invalid-project')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
  });

  it('should display the namespace name in the body when provided', () => {
    render(
      <MemoryRouter>
        <EvalHubInvalidProject namespace="bad-project" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Project bad-project was not found.')).toBeInTheDocument();
  });

  it('should display generic message when namespace is not provided', () => {
    render(
      <MemoryRouter>
        <EvalHubInvalidProject getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByText('The project was not found.')).toBeInTheDocument();
  });

  it('should render the project selector in the footer', () => {
    render(
      <MemoryRouter>
        <EvalHubInvalidProject namespace="bad-project" getRedirectPath={mockGetRedirectPath} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });
});
