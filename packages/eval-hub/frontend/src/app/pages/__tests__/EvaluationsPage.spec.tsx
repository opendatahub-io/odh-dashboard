import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EvaluationsPage from '../EvaluationsPage';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-project' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
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

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

describe('EvaluationsPage', () => {
  const renderPage = (namespace: string) =>
    render(
      <MemoryRouter initialEntries={[`/${namespace}`]}>
        <Routes>
          <Route path="/:namespace" element={<EvaluationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('should render the page with correct title and description', () => {
    renderPage('test-project');
    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Run evaluations on models, agents, and datasets to optimize performance.',
    );
  });

  it('should show empty state when there are no evaluation runs', () => {
    renderPage('test-project');
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
  });

  it('should render the project selector with the current namespace', () => {
    renderPage('test-project');
    expect(screen.getByTestId('project-selector')).toHaveTextContent('test-project');
  });
});
