import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

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

const mockUseFeatureFlag = jest.mocked(useFeatureFlag);

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
  it('keeps the project selector when Grid mode is disabled', () => {
    mockUseFeatureFlag.mockReturnValue([false, jest.fn()]);

    renderHeader();

    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });

  it('hides the project selector when Grid mode is enabled', () => {
    mockUseFeatureFlag.mockReturnValue([true, jest.fn()]);

    renderHeader();

    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-selector')).not.toBeInTheDocument();
  });
});
