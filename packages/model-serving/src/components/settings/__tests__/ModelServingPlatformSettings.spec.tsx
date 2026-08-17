import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useServingPlatformStatuses } from '@odh-dashboard/plugin-core/host-api';
import type { ServingPlatformStatuses } from '@odh-dashboard/plugin-core/host-api';
import ModelServingPlatformSettings from '../ModelServingPlatformSettings';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useServingPlatformStatuses: jest.fn(),
}));

const mockUseServingPlatformStatuses = jest.mocked(useServingPlatformStatuses);

const defaultStatuses: ServingPlatformStatuses = {
  kServe: { enabled: true, installed: true },
  kServeNIM: { enabled: false, installed: true },
  platformEnabledCount: 1,
  refreshNIMAvailability: jest.fn(),
};

describe('ModelServingPlatformSettings', () => {
  const mockSetEnabledPlatforms = jest.fn();
  const mockSetIsDistributedInferencingDefault = jest.fn();

  const defaultProps = {
    enabledPlatforms: { kServe: true, LLMd: true },
    setEnabledPlatforms: mockSetEnabledPlatforms,
    isDistributedInferencingDefault: true,
    setIsDistributedInferencingDefault: mockSetIsDistributedInferencingDefault,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServingPlatformStatuses.mockReturnValue(defaultStatuses);
  });

  it('should render enable model serving switch', () => {
    render(<ModelServingPlatformSettings {...defaultProps} />);

    expect(screen.getByTestId('single-model-serving-platform-enabled-switch')).toBeInTheDocument();
  });

  it('should render distributed inferencing section', () => {
    render(<ModelServingPlatformSettings {...defaultProps} />);

    expect(screen.getByText('Distributed inferencing')).toBeInTheDocument();
    expect(screen.getByTestId('enable-llmd-switch')).toBeInTheDocument();
    expect(screen.getByTestId('use-distributed-llm-default-switch')).toBeInTheDocument();
  });

  it('should render learn more popover button', () => {
    render(<ModelServingPlatformSettings {...defaultProps} />);

    expect(screen.getByText('Learn more about distributed inferencing')).toBeInTheDocument();
  });

  it('should disable enable model serving switch when kServe is not installed', () => {
    mockUseServingPlatformStatuses.mockReturnValue({
      ...defaultStatuses,
      kServe: { enabled: false, installed: false },
    });

    render(<ModelServingPlatformSettings {...defaultProps} />);

    expect(screen.getByTestId('single-model-serving-platform-enabled-switch')).toBeDisabled();
  });

  it('should call setEnabledPlatforms when model serving switch is toggled off', () => {
    render(<ModelServingPlatformSettings {...defaultProps} />);

    fireEvent.click(screen.getByTestId('single-model-serving-platform-enabled-switch'));

    expect(mockSetEnabledPlatforms).toHaveBeenCalledWith({
      kServe: false,
      LLMd: false,
    });
    expect(mockSetIsDistributedInferencingDefault).toHaveBeenCalledWith(false);
  });

  it('should show warning when kServe is not installed', () => {
    mockUseServingPlatformStatuses.mockReturnValue({
      ...defaultStatuses,
      kServe: { enabled: false, installed: false },
    });

    render(
      <ModelServingPlatformSettings
        {...defaultProps}
        enabledPlatforms={{ kServe: false, LLMd: false }}
      />,
    );

    expect(screen.getByTestId('serving-platform-warning-alert')).toBeInTheDocument();
  });

  it('should show inferencing gateway warning when llmd is not enabled', () => {
    render(
      <ModelServingPlatformSettings
        {...defaultProps}
        enabledPlatforms={{ kServe: true, LLMd: false }}
      />,
    );

    expect(
      screen.getByText(
        'To use distributed inferencing, you must configure the inferencing gateway on your cluster.',
      ),
    ).toBeInTheDocument();
  });

  it('should disable llmd switches when kServe is disabled', () => {
    render(
      <ModelServingPlatformSettings
        {...defaultProps}
        enabledPlatforms={{ kServe: false, LLMd: false }}
      />,
    );

    expect(screen.getByTestId('enable-llmd-switch')).toBeDisabled();
    expect(screen.getByTestId('use-distributed-llm-default-switch')).toBeDisabled();
  });
});
