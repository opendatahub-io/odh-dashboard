import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';

// Mock React Router hooks
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

// Mock SecretSelector component
jest.mock('~/app/shared/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    value,
    dataTestId,
  }: {
    onChange: (secret: { uuid: string; name: string } | undefined) => void;
    value?: string;
    dataTestId?: string;
  }) => (
    <div data-testid={dataTestId}>
      <button
        data-testid={`${dataTestId}-select-secret-1`}
        onClick={() => onChange({ uuid: 'secret-1', name: 'Test Secret 1' })}
      >
        Select Secret 1
      </button>
      <button
        data-testid={`${dataTestId}-select-secret-2`}
        onClick={() => onChange({ uuid: 'secret-2', name: 'Test Secret 2' })}
      >
        Select Secret 2
      </button>
      {value && <div data-testid={`${dataTestId}-value`}>{value}</div>}
    </div>
  ),
}));

// Mock FileExplorer component
jest.mock('~/app/components/common/FileExplorer/FileExplorer.tsx', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);

describe('AutoragConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('initial state - no secret selected', () => {
    it('should NOT display the "Selected connection" section when no secret is selected', () => {
      render(<AutoragConfigure />);

      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
    });

    it('should NOT display the "Selected files" section when no secret is selected', () => {
      render(<AutoragConfigure />);

      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });

    it('should NOT display the "Select files" button when no secret is selected', () => {
      render(<AutoragConfigure />);

      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should display "Selected connection" section when a secret is selected', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected connection" section appears
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
    });

    it('should display the selected secret name as a Label when a secret is selected', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret name is displayed
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
    });

    it('should display "Selected files" section when a secret is selected', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected files" section appears
      expect(screen.getByText('Selected files')).toBeInTheDocument();
    });

    it('should display the "Select files" button when a secret is selected', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button appears
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });

    it('should display different secret name when selecting a different secret', () => {
      render(<AutoragConfigure />);

      // Select first secret
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();

      // Select second secret
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);
      expect(screen.getByText('Test Secret 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Secret 1')).not.toBeInTheDocument();
    });
  });

  describe('clearing selected secret', () => {
    it('should clear the selected secret when clicking the X on the Label', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret is displayed
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
      expect(screen.getByText('Selected files')).toBeInTheDocument();

      // Find and click the close button on the Label
      // PatternFly Label with onClose renders a button with aria-label="close"
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const labelCloseButton = closeButtons.find((button) => button.closest('.pf-v6-c-label'));

      expect(labelCloseButton).toBeInTheDocument();
      if (labelCloseButton) {
        fireEvent.click(labelCloseButton);
      }

      // Verify the secret is cleared and sections are hidden
      expect(screen.queryByText('Test Secret 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });

    it('should hide the selected connection and files sections after clearing', () => {
      render(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify sections are visible
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
      expect(screen.getByText('Selected files')).toBeInTheDocument();

      // Find and click the close button on the Label
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const labelCloseButton = closeButtons.find((button) => button.closest('.pf-v6-c-label'));

      if (labelCloseButton) {
        fireEvent.click(labelCloseButton);
      }

      // Verify sections are hidden
      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });
  });
});
