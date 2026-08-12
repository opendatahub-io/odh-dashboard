import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentStrategySettings from '../DeploymentStrategySettings';

describe('DeploymentStrategySettings', () => {
  const mockSetDefaultDeploymentStrategy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render section heading and both radio options', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy="rolling"
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
        defaultDeploymentStrategy="rolling"
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    expect(screen.getByRole('radio', { name: /Rolling update/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Recreate/i })).not.toBeChecked();
  });

  it('should check recreate radio when strategy is recreate', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy="recreate"
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    expect(screen.getByRole('radio', { name: /Rolling update/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Recreate/i })).toBeChecked();
  });

  it('should call setter with "recreate" when recreate radio is selected', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy="rolling"
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Recreate/i }));
    expect(mockSetDefaultDeploymentStrategy).toHaveBeenCalledWith('recreate');
  });

  it('should call setter with "rolling" when rolling radio is selected', () => {
    render(
      <DeploymentStrategySettings
        defaultDeploymentStrategy="recreate"
        setDefaultDeploymentStrategy={mockSetDefaultDeploymentStrategy}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Rolling update/i }));
    expect(mockSetDefaultDeploymentStrategy).toHaveBeenCalledWith('rolling');
  });
});
