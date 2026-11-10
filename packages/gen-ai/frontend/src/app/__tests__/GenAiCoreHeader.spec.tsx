import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { UNIFIED_PROJECT_SELECTOR: 'unified-project-selector' },
  useIsAreaAvailable: jest.fn(),
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
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
  });

  it.each([
    { gridEnabled: false, unifiedProjectSelectorEnabled: false, selectorVisible: true },
    { gridEnabled: true, unifiedProjectSelectorEnabled: false, selectorVisible: false },
    { gridEnabled: false, unifiedProjectSelectorEnabled: true, selectorVisible: false },
    { gridEnabled: true, unifiedProjectSelectorEnabled: true, selectorVisible: false },
  ])(
    'should handle project selector visibility when Grid=$gridEnabled and UPS=$unifiedProjectSelectorEnabled',
    ({ gridEnabled, unifiedProjectSelectorEnabled, selectorVisible }) => {
      mockUseFeatureFlag.mockReturnValue([gridEnabled, jest.fn()]);
      mockUseIsAreaAvailable.mockReturnValue({
        status: unifiedProjectSelectorEnabled,
      } as ReturnType<typeof useIsAreaAvailable>);

      renderHeader();

      if (selectorVisible) {
        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByTestId('project-selector')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Project')).not.toBeInTheDocument();
        expect(screen.queryByTestId('project-selector')).not.toBeInTheDocument();
      }
    },
  );
});
