import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import ModelTrainingProjectSelector from '../ModelTrainingProjectSelector';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: {
    UNIFIED_PROJECT_SELECTOR: 'unified-project-selector',
  },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator', () => {
  const MockProjectSelectorNavigator: React.FC = () => (
    <div data-testid="model-training-project-selector" />
  );

  return { __esModule: true, default: MockProjectSelectorNavigator };
});

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

describe('ModelTrainingProjectSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the current project selector when the unified project selector is disabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);

    render(<ModelTrainingProjectSelector getRedirectPath={() => '/training-jobs/project'} />);

    expect(screen.getByTestId('model-training-project-selector')).toBeInTheDocument();
    expect(mockUseIsAreaAvailable).toHaveBeenCalledWith(SupportedArea.UNIFIED_PROJECT_SELECTOR);
  });

  it('should hide the current project selector when the unified project selector is enabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof useIsAreaAvailable
    >);

    render(<ModelTrainingProjectSelector getRedirectPath={() => '/training-jobs/project'} />);

    expect(screen.queryByTestId('model-training-project-selector')).not.toBeInTheDocument();
  });
});
