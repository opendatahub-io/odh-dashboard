import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentStrategySettings, { DeploymentStrategy } from '../DeploymentStrategySettings';

describe('DeploymentStrategySettings', () => {
  const mockSetDefaultDeploymentStrategy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render section heading and both radio options', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy={DeploymentStrategy.ROLLING}
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    expect(screen.getByText('Default deployment strategy')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-strategy-rolling')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-strategy-recreate')).toBeInTheDocument();
  });

  it('should check rolling radio when strategy is rolling', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy={DeploymentStrategy.ROLLING}
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    expect(screen.getByRole('radio', { name: /Rolling update/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Recreate/i })).not.toBeChecked();
  });

  it('should check recreate radio when strategy is recreate', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy={DeploymentStrategy.RECREATE}
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    expect(screen.getByRole('radio', { name: /Rolling update/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Recreate/i })).toBeChecked();
  });

  it('should call setter with DeploymentStrategy.RECREATE when recreate radio is selected', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy={DeploymentStrategy.ROLLING}
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Recreate/i }));
    expect(mockSetDefaultDeploymentStrategy).toHaveBeenCalledWith(DeploymentStrategy.RECREATE);
  });

  it('should call setter with DeploymentStrategy.ROLLING when rolling radio is selected', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy={DeploymentStrategy.RECREATE}
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Rolling update/i }));
    expect(mockSetDefaultDeploymentStrategy).toHaveBeenCalledWith(DeploymentStrategy.ROLLING);
  });
});
