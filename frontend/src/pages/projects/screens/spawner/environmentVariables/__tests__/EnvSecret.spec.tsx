import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { SecretCategory } from '#~/pages/projects/types';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

jest.mock('#~/utilities/utils', () => ({
  getDashboardMainContainer: jest.fn(() => undefined),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<SecretKind>);

describe('EnvSecret', () => {
  const mockOnUpdate = jest.fn();
  const mockOnExistingNameChange = jest.fn();
  const defaultProps = {
    onUpdate: mockOnUpdate,
    namespace: 'test-ns',
    onExistingNameChange: mockOnExistingNameChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    k8sListResourceMock.mockResolvedValue({ items: [] } as never);
  });

  it('should render the data type selector', () => {
    render(<EnvSecret {...defaultProps} />);
    expect(screen.getByTestId('env-data-type-field')).toBeInTheDocument();
  });

  it('should show Key / value, Upload, and Existing secret options in the dropdown', () => {
    render(<EnvSecret {...defaultProps} />);
    const dropdown = screen.getByTestId('env-data-type-field');
    // Open the dropdown
    const toggle = within(dropdown).getByRole('button');
    fireEvent.click(toggle);

    expect(screen.getByText('Key / value')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Existing secret')).toBeInTheDocument();
  });

  it('should render EnvExistingSecret when Existing secret category is selected', async () => {
    render(
      <EnvSecret
        {...defaultProps}
        env={{
          category: SecretCategory.EXISTING,
          data: [],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-selector')).toBeInTheDocument();
    });
  });

  it('should call onUpdate with EXISTING category when Existing secret is selected', () => {
    render(<EnvSecret {...defaultProps} />);
    const dropdown = screen.getByTestId('env-data-type-field');
    const toggle = within(dropdown).getByRole('button');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText('Existing secret'));

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        category: SecretCategory.EXISTING,
        data: [],
      }),
    );
  });
});
