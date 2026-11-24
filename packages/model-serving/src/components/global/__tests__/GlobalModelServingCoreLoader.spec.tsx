import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import GlobalModelServingCoreLoader from '../GlobalModelServingCoreLoader';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useHostApi: () => ({ contexts: { ModelServingContextProvider: () => null } }),
}));
jest.mock('../NoProjectsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="no-projects-page" />,
}));
jest.mock('../GlobalNoModelsView', () => ({
  __esModule: true,
  GlobalNoModelsView: () => <div data-testid="no-models-view" />,
}));
jest.mock('../ModelServingProjectSelection', () => ({
  __esModule: true,
  default: () => null,
}));

const namespace = (name: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: { phase: 'Active' },
});

const renderLoader = (deploymentTargetProjects?: ProjectKind[]) => {
  const context: ProjectsContextType = {
    projects: [],
    modelServingProjects: [],
    nonActiveProjects: [],
    deploymentTargetProjects,
    preferredProject: null,
    updatePreferredProject: jest.fn(),
    waitForProject: jest.fn(),
    loaded: true,
    loadError: undefined,
  };
  render(
    <ProjectsContext.Provider value={context}>
      <MemoryRouter initialEntries={['/deployments']}>
        <Routes>
          <Route
            path="/deployments"
            element={<GlobalModelServingCoreLoader getInvalidRedirectPath={(ns) => `/${ns}`} />}
          />
        </Routes>
      </MemoryRouter>
    </ProjectsContext.Provider>,
  );
};

describe('GlobalModelServingCoreLoader', () => {
  it('should offer deploying to a caller who browses no project but may deploy', () => {
    renderLoader([namespace('create-only')]);
    expect(screen.getByTestId('no-models-view')).toBeInTheDocument();
    expect(screen.queryByTestId('no-projects-page')).not.toBeInTheDocument();
  });

  it.each([[undefined], [[]]])(
    'should show the no-projects page without deployment targets (%p)',
    (targets) => {
      renderLoader(targets);
      expect(screen.getByTestId('no-projects-page')).toBeInTheDocument();
    },
  );
});
