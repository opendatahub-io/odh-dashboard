import * as React from 'react';
import { render, screen } from '@testing-library/react';
import EvalHubNoProjects from '../EvalHubNoProjects';

describe('EvalHubNoProjects', () => {
  it('should render the no projects empty state', () => {
    render(<EvalHubNoProjects />);
    expect(screen.getByTestId('eval-hub-no-projects')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No projects' })).toBeInTheDocument();
  });

  it('should render the instruction body text', () => {
    render(<EvalHubNoProjects />);
    expect(screen.getByText('To get started, create a project.')).toBeInTheDocument();
  });
});
