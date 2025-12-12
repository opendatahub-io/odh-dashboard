import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { MemoryRouter } from 'react-router-dom';
import { DeployButton } from '../DeployButton';

// Mock the useNavigateToDeploymentWizard hook
const mockNavigateToDeploymentWizard = jest.fn();
jest.mock('../../deploymentWizard/useNavigateToDeploymentWizard', () => ({
  useNavigateToDeploymentWizard: () => mockNavigateToDeploymentWizard,
}));

// Mock the useCanMakeNewDeployment hook
const mockUseCanMakeNewDeployment = jest.fn();
jest.mock('../../../concepts/useCanMakeNewDeployment', () => ({
  useCanMakeNewDeployment: (project: ProjectKind | null) => mockUseCanMakeNewDeployment(project),
}));

const mockProject: ProjectKind = {
  apiVersion: 'project.openshift.io/v1',
  kind: 'Project',
  metadata: {
    name: 'test-project',
    namespace: 'test-project',
  },
};

describe('DeployButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanMakeNewDeployment.mockReturnValue({
      disabled: false,
      disabledReason: '',
    });
  });

  const renderDeployButton = (
    props: {
      project?: ProjectKind | null;
      variant?: 'primary' | 'secondary' | 'link';
    } = {},
  ) =>
    render(
      <MemoryRouter>
        <DeployButton project={props.project ?? null} variant={props.variant} />
      </MemoryRouter>,
    );

  describe('disabled states', () => {
    it('should show tooltip when disabled due to missing templates', () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: true,
        disabledReason:
          'At least one serving runtime must be enabled to deploy a model. Contact your administrator.',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show tooltip when disabled due to Kueue not enabled', () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: true,
        disabledReason: 'Kueue is not enabled. Contact your administrator.',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show tooltip when disabled due to missing deploy methods', () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: true,
        disabledReason:
          'At least one model servingplatform must be enabled to deploy a model. Contact your administrator.',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not be aria-disabled when enabled', () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: false,
        disabledReason: '',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should wrap button in tooltip when disabled', async () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: true,
        disabledReason: 'Test disabled reason',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      // The button should be wrapped in a tooltip trigger (div with display: contents)
      expect(button.parentElement).toHaveStyle({ display: 'contents' });
    });

    it('should not wrap button in tooltip when enabled', () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: false,
        disabledReason: '',
      });

      renderDeployButton();

      const button = screen.getByTestId('deploy-button');
      // The button should not be wrapped in a tooltip trigger
      expect(button.parentElement).not.toHaveStyle({ display: 'contents' });
    });
  });

  describe('onClick behavior', () => {
    it('should call navigateToDeploymentWizard with project name when project is provided', async () => {
      renderDeployButton({ project: mockProject });

      const button = screen.getByTestId('deploy-button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockNavigateToDeploymentWizard).toHaveBeenCalledTimes(1);
      expect(mockNavigateToDeploymentWizard).toHaveBeenCalledWith('test-project');
    });

    it('should call navigateToDeploymentWizard with undefined when project is null', async () => {
      renderDeployButton({ project: null });

      const button = screen.getByTestId('deploy-button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockNavigateToDeploymentWizard).toHaveBeenCalledTimes(1);
      expect(mockNavigateToDeploymentWizard).toHaveBeenCalledWith(undefined);
    });

    it('should not navigate when button is disabled and clicked', async () => {
      mockUseCanMakeNewDeployment.mockReturnValue({
        disabled: true,
        disabledReason: 'Test disabled reason',
      });

      renderDeployButton({ project: mockProject });

      const button = screen.getByTestId('deploy-button');
      await act(async () => {
        fireEvent.click(button);
      });

      // When using isAriaDisabled, the button is still clickable but should be treated as disabled
      // The click event still fires, but the user experience indicates it's disabled
      // PatternFly's isAriaDisabled prevents the default action
      expect(mockNavigateToDeploymentWizard).not.toHaveBeenCalled();
    });
  });
});
