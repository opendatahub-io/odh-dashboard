import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureFlagLauncher, {
  FeatureFlagLauncherProps,
} from '~/app/FeatureFlags/FeatureFlagLauncher';

const ffMockDashboardConfig = {
  enablement: true,
  disableHome: false,
  disableAppLauncher: true,
  disableInfo: false,
  disableHardwareProfiles: false,
};

describe('FeatureFlagLauncher', () => {
  const mockSetDevFeatureFlag = jest.fn();
  const mockResetDevFeatureFlags = jest.fn();
  const mockDevFeatureFlags = {
    disableHome: false,
    disableAppLauncher: false,
    disableInfo: false,
  };

  const defaultProps: FeatureFlagLauncherProps = {
    dashboardConfig: ffMockDashboardConfig,
    devFeatureFlags: mockDevFeatureFlags,
    setDevFeatureFlag: mockSetDevFeatureFlag,
    resetDevFeatureFlags: mockResetDevFeatureFlags,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the feature flag launcher button', () => {
    render(<FeatureFlagLauncher {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Feature Flag Launcher' })).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    render(<FeatureFlagLauncher {...defaultProps} />);
    const button = screen.getByRole('button', { name: 'Feature Flag Launcher' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    expect(screen.getByText('Edit Flags')).toBeInTheDocument();
    expect(screen.getByText('Restore Flags to default values')).toBeInTheDocument();
  });

  it('should open modal when Edit Flags is clicked', async () => {
    render(<FeatureFlagLauncher {...defaultProps} />);

    // Open dropdown
    const button = screen.getByRole('button', { name: 'Feature Flag Launcher' });
    await act(async () => {
      fireEvent.click(button);
    });

    // Click Edit Flags
    const editButton = screen.getByText('Edit Flags');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Modal should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call resetDevFeatureFlags when Restore Flags is clicked', async () => {
    render(<FeatureFlagLauncher {...defaultProps} />);

    // Open dropdown
    const button = screen.getByRole('button', { name: 'Feature Flag Launcher' });
    await act(async () => {
      fireEvent.click(button);
    });

    // Click Restore Flags
    const restoreButton = screen.getByText('Restore Flags to default values');
    await act(async () => {
      fireEvent.click(restoreButton);
    });

    expect(mockResetDevFeatureFlags).toHaveBeenCalledTimes(1);
  });

  it('should show tooltip on hover', async () => {
    render(<FeatureFlagLauncher {...defaultProps} />);

    const button = screen.getByRole('button', { name: 'Feature Flag Launcher' });
    await act(async () => {
      fireEvent.mouseEnter(button);
    });

    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
  });
});
