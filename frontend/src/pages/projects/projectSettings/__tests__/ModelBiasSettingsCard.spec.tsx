import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useTrustySettingsAccessAllowed } from '#~/concepts/trustyai/content/useTrustySettingsAccessAllowed';
import useManageTrustyAICR from '#~/concepts/trustyai/useManageTrustyAICR';
import { TrustyInstallState } from '#~/concepts/trustyai/types';
import ModelBiasSettingsCard from '#~/pages/projects/projectSettings/ModelBiasSettingsCard';

jest.mock('#~/concepts/trustyai/content/useTrustySettingsAccessAllowed');
jest.mock('#~/concepts/trustyai/useManageTrustyAICR');

const mockUseTrustySettingsAccessAllowed = jest.mocked(useTrustySettingsAccessAllowed);
const mockUseManageTrustyAICR = jest.mocked(useManageTrustyAICR);

const mockProject = {
  metadata: { name: 'test-ns' },
} as React.ComponentProps<typeof ModelBiasSettingsCard>['project'];

describe('ModelBiasSettingsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show skeleton while access reviews are loading', () => {
    mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: false, allowed: undefined });
    mockUseManageTrustyAICR.mockReturnValue({
      statusState: { type: TrustyInstallState.UNINSTALLED },
      installCRForNewDB: jest.fn(),
      installCRForExistingDB: jest.fn(),
      deleteCR: jest.fn(),
    });
    render(<ModelBiasSettingsCard project={mockProject} />);
    expect(screen.getByTestId('trustyai-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('trustyai-configure-button')).not.toBeInTheDocument();
  });

  describe('when TrustyAI is uninstalled', () => {
    beforeEach(() => {
      mockUseManageTrustyAICR.mockReturnValue({
        statusState: { type: TrustyInstallState.UNINSTALLED },
        installCRForNewDB: jest.fn(),
        installCRForExistingDB: jest.fn(),
        deleteCR: jest.fn(),
      });
    });

    it('should show enabled configure button when user has all permissions', () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
      render(<ModelBiasSettingsCard project={mockProject} />);
      const button = screen.getByTestId('trustyai-configure-button');
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should show disabled configure button when user lacks permission', () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
      render(<ModelBiasSettingsCard project={mockProject} />);
      const button = screen.getByTestId('trustyai-configure-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show permission tooltip when hovering disabled configure button', async () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
      render(<ModelBiasSettingsCard project={mockProject} />);
      await userEvent.hover(screen.getByTestId('trustyai-configure-button'));
      expect(
        await screen.findByText(/don't have permission to configure TrustyAI/),
      ).toBeInTheDocument();
    });
  });

  describe('when TrustyAI is installed', () => {
    beforeEach(() => {
      mockUseManageTrustyAICR.mockReturnValue({
        statusState: { type: TrustyInstallState.INSTALLED, showSuccess: false },
        installCRForNewDB: jest.fn(),
        installCRForExistingDB: jest.fn(),
        deleteCR: jest.fn(),
      });
    });

    it('should show enabled uninstall button when user has all permissions', () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
      render(<ModelBiasSettingsCard project={mockProject} />);
      const button = screen.getByTestId('trustyai-uninstall-button');
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should show disabled uninstall button when user lacks permission', () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
      render(<ModelBiasSettingsCard project={mockProject} />);
      const button = screen.getByTestId('trustyai-uninstall-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show permission tooltip when hovering disabled uninstall button', async () => {
      mockUseTrustySettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
      render(<ModelBiasSettingsCard project={mockProject} />);
      await userEvent.hover(screen.getByTestId('trustyai-uninstall-button'));
      expect(
        await screen.findByText(/don't have permission to configure TrustyAI/),
      ).toBeInTheDocument();
    });
  });
});
