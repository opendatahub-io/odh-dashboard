import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ObservabilityNoProjects from '../ObservabilityNoProjects';

jest.mock('@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton', () => ({
  __esModule: true,
  default: () => <button type="button">Create project</button>,
}));

describe('ObservabilityNoProjects', () => {
  it('should render empty state with create project action', () => {
    render(
      <MemoryRouter>
        <ObservabilityNoProjects />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('observability-no-projects')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'No projects' })).toBeDefined();
    expect(
      screen.getByText('To view dashboards and metrics, first create a project.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDefined();
  });
});
