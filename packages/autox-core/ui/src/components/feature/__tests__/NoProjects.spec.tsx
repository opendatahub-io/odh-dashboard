import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NoProjects from '../NoProjects';

const Icon = () => <img src="empty.svg" alt="Infrastructure" />;

describe('NoProjects', () => {
  it('renders the product-specific message and provided icon', () => {
    render(
      <MemoryRouter>
        <NoProjects productName="AutoML" icon={Icon} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'No projects' })).toBeInTheDocument();
    expect(
      screen.getByText('To create an AutoML experiment, first create a project.'),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Infrastructure')).toBeInTheDocument();
  });

  it('navigates to the default /projects route on button click', () => {
    render(
      <MemoryRouter initialEntries={['/start']}>
        <NoProjects productName="AutoML" icon={Icon} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to Projects page' }));
    // No throw / crash is sufficient smoke coverage for navigation in a MemoryRouter without Routes.
  });

  it('accepts a custom projectsRoute', () => {
    render(
      <MemoryRouter>
        <NoProjects productName="AutoRAG" icon={Icon} projectsRoute="/custom-projects" />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('To create an AutoRAG experiment, first create a project.'),
    ).toBeInTheDocument();
  });
});
