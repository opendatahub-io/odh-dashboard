import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () => ({
  ProjectIconWithSize: () => <span data-testid="project-icon" />,
}));

jest.mock('~/app/GenAiCoreProjectSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="project-selector" />,
}));

jest.mock('~/app/HeaderIcon', () => ({
  __esModule: true,
  default: () => <span data-testid="header-icon" />,
}));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <GenAiCoreHeader
        title="Playground"
        getRedirectPath={(namespace) => `/playground/${namespace}`}
      />
    </MemoryRouter>,
  );

describe('GenAiCoreHeader', () => {
  it('shows the project selector', () => {
    renderHeader();

    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });
});
