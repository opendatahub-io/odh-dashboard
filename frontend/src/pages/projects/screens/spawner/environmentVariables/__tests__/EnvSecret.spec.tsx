import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecretCategory } from '#~/pages/projects/types';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';

// Mock the EnvExistingSecretField component
jest.mock('#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField', () => {
  return function MockEnvExistingSecretField() {
    return <div data-testid="env-existing-secret-field">Existing secret field</div>;
  };
});

describe('EnvSecret', () => {
  const mockOnUpdate = jest.fn();
  const defaultProps = {
    namespace: 'test-namespace',
    onUpdate: mockOnUpdate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dropdown and show "Existing secret" option when opened', async () => {
    render(<EnvSecret {...defaultProps} />);

    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByRole('button', { name: 'Options menu' });
    fireEvent.click(dropdownToggle);

    // Check that all three options are available in the dropdown menu
    expect(screen.getByText('Key / value')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Existing secret')).toBeInTheDocument();
  });

  it('should render Existing secret option when selected', () => {
    const env = {
      category: SecretCategory.EXISTING,
      data: [],
    };

    render(<EnvSecret {...defaultProps} env={env} />);

    // Should show the existing secret field
    expect(screen.getByTestId('env-existing-secret-field')).toBeInTheDocument();
  });

  it('should render Upload option when selected', () => {
    const env = {
      category: SecretCategory.UPLOAD,
      data: [],
    };

    render(<EnvSecret {...defaultProps} env={env} />);

    // Should show the upload field - look for the textarea element with id
    expect(screen.getByRole('textbox', { name: 'File upload' })).toBeInTheDocument();
  });
});
