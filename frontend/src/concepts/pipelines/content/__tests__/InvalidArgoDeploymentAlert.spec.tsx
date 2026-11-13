import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { InvalidArgoDeploymentAlert } from '#~/concepts/pipelines/content/InvalidArgoDeploymentAlert';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  useIsAreaAvailable: jest.fn(),
  SupportedArea: { DS_PIPELINES_ARGO_INVALID: 'ds-pipelines-argo-invalid' },
}));

jest.mock('@odh-dashboard/ui-core/utilities', () => ({
  useBrowserStorage: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/content/PipelineMigrationNoteLinks', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-migration-links" />,
}));

jest.mock('#~/utilities/const', () => ({
  ODH_PRODUCT_NAME: 'OpenShift AI',
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseBrowserStorage = jest.mocked(useBrowserStorage);

/** The area is available when an unmanaged Argo install is blocking pipelines. */
const mockAreaStatus = (status: boolean) => {
  mockUseIsAreaAvailable.mockReturnValue({
    status,
    devFlags: null,
    featureFlags: null,
    reliantAreas: null,
    requiredComponents: null,
    requiredCapabilities: null,
  });
};

describe('InvalidArgoDeploymentAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display Pipelines enablement failed alert', () => {
    mockUseBrowserStorage.mockReturnValue([false, jest.fn()]);
    mockAreaStatus(true);

    render(<InvalidArgoDeploymentAlert />);

    expect(screen.getByTestId('invalid-argo-alert')).toBeInTheDocument();
    expect(screen.getByText('Pipelines enablement failed')).toBeInTheDocument();
  });

  it('should not display alert when condition is not met', () => {
    mockUseBrowserStorage.mockReturnValue([false, jest.fn()]);
    mockAreaStatus(false);

    render(<InvalidArgoDeploymentAlert />);

    expect(screen.queryByTestId('invalid-argo-alert')).not.toBeInTheDocument();
  });

  it('should not display alert when dismissed', () => {
    mockUseBrowserStorage.mockReturnValue([true, jest.fn()]);
    mockAreaStatus(true);

    render(<InvalidArgoDeploymentAlert />);

    expect(screen.queryByTestId('invalid-argo-alert')).not.toBeInTheDocument();
  });

  it('should dismiss alert when close button is clicked', () => {
    const mockSetDismissed = jest.fn();
    mockUseBrowserStorage.mockReturnValue([false, mockSetDismissed]);
    mockAreaStatus(true);

    render(<InvalidArgoDeploymentAlert />);

    fireEvent.click(
      screen.getByLabelText('Close Warning alert: alert: Pipelines enablement failed'),
    );
    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });
});
