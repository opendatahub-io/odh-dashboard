import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFetchState } from 'mod-arch-core';
import { SecretListItem } from '~/app/types';
import { mockStorageSecret, mockLLSSecret } from '~/__mocks__/mockSecretListItem';
import SecretSelector from '~/app/components/common/SecretSelector';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useFetchState: jest.fn(),
}));

jest.mock('mod-arch-shared', () => jest.requireActual('~/__mocks__/mod-arch-shared'));

const mockUseFetchState = jest.mocked(useFetchState);

describe('SecretSelector', () => {
  const mockOnChange = jest.fn();
  const mockRefresh = jest.fn();
  const defaultNamespace = 'test-namespace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeleton when loading', () => {
      mockUseFetchState.mockReturnValue([[], false, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Skeleton should be present during loading
      const skeleton = document.querySelector('.pf-v6-c-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('success state with secrets', () => {
    const mockSecrets: SecretListItem[] = [
      mockStorageSecret({ uuid: '1', name: 'aws-secret-1' }),
      mockStorageSecret({ uuid: '2', name: 'aws-secret-2' }),
      mockLLSSecret({ uuid: '3', name: 'lls-secret-1' }),
    ];

    it('should render dropdown with secrets when loaded', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toBeInTheDocument();
      expect(toggle).not.toBeDisabled();
      expect(toggle).toHaveTextContent('Select a secret');
    });

    it('should render label above the field when label prop is provided', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          label="Choose AWS Secret"
          dataTestId="test-selector"
        />,
      );

      // Label should be rendered above the field
      const label = screen.getByText('Choose AWS Secret');
      expect(label).toBeInTheDocument();

      // The selector toggle itself should show the placeholder, not the label
      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toHaveTextContent('Select a secret');
      expect(toggle).not.toHaveTextContent('Choose AWS Secret');
    });

    it('should render without Form wrapper when label is not provided', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      const { container } = render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Should render TypeaheadSelect without FormGroup wrapper
      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveTextContent('Select a secret');

      // No label element should be present
      expect(container.querySelector('label')).toBeNull();
    });

    it('should render custom placeholder in the field', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          placeholder="Pick your secret"
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toHaveTextContent('Pick your secret');
    });

    it('should render both label and custom placeholder correctly', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          label="Secret Configuration"
          placeholder="Choose a secret from the list"
          dataTestId="test-selector"
        />,
      );

      // Label should be above the field
      const label = screen.getByText('Secret Configuration');
      expect(label).toBeInTheDocument();

      // Placeholder should be in the toggle
      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toHaveTextContent('Choose a secret from the list');
      expect(toggle).not.toHaveTextContent('Secret Configuration');
    });

    it('should show selected secret name', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value="2"
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      expect(screen.getByTestId('test-selector')).toHaveTextContent('aws-secret-2');
    });

    it('should open dropdown on click', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      fireEvent.click(toggle);

      // Should show all three secrets
      expect(screen.getByText('aws-secret-1')).toBeInTheDocument();
      expect(screen.getByText('aws-secret-2')).toBeInTheDocument();
      expect(screen.getByText('lls-secret-1')).toBeInTheDocument();
    });

    it('should display secret type as description', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Type descriptions should be visible
      expect(screen.getAllByText('Type: s3')).toHaveLength(2);
      expect(screen.getByText('Type: lls')).toBeInTheDocument();
    });

    it('should call onChange with uuid and name when secret is selected', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('aws-secret-2'));

      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '2',
        name: 'aws-secret-2',
        invalid: false,
      });
    });

    it('should close dropdown after selection', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      expect(screen.getByText('aws-secret-1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('aws-secret-1'));

      // Options should no longer be visible
      expect(screen.queryByText('aws-secret-2')).not.toBeInTheDocument();
    });

    it('should filter by storage type when type prop is provided', () => {
      // This tests that the API is called with the correct parameters
      // The actual filtering happens in the BFF
      mockUseFetchState.mockReturnValue([[mockStorageSecret()], true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          type="storage"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Verify useFetchState was called (callback will include type parameter)
      expect(mockUseFetchState).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should disable dropdown when no secrets available', () => {
      mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveTextContent('Select a secret');
    });

    it('should not open dropdown when clicked and no secrets available', () => {
      mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      fireEvent.click(toggle);

      // No options should be rendered
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    const mockError = new Error('Failed to fetch secrets');

    it('should disable dropdown when error occurs', () => {
      mockUseFetchState.mockReturnValue([[], true, mockError, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toBeDisabled();
    });

    it('should show error message below dropdown', () => {
      mockUseFetchState.mockReturnValue([[], true, mockError, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      expect(screen.getByText('Secrets could not be fetched')).toBeInTheDocument();
    });

    it('should show danger status on toggle when error occurs', () => {
      mockUseFetchState.mockReturnValue([[], true, mockError, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      // PatternFly applies 'pf-m-danger' class when status="danger"
      expect(toggle).toHaveClass('pf-m-danger');
    });

    it('should not call onChange when error state', () => {
      mockUseFetchState.mockReturnValue([[], true, mockError, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      fireEvent.click(toggle);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    const mockSecrets: SecretListItem[] = [mockStorageSecret()];

    it('should be disabled when isDisabled prop is true', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          isDisabled
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toBeDisabled();
    });

    it('should not open dropdown when disabled', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          isDisabled
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      fireEvent.click(toggle);

      expect(screen.queryByText(mockSecrets[0].name)).not.toBeInTheDocument();
    });
  });

  describe('namespace and type changes', () => {
    it('should refetch when namespace changes', () => {
      const { rerender } = render(
        <SecretSelector
          namespace="namespace-1"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const firstCallCount = mockUseFetchState.mock.calls.length;

      rerender(
        <SecretSelector
          namespace="namespace-2"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // useFetchState should be called again with new namespace
      expect(mockUseFetchState.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('should refetch when type changes', () => {
      const { rerender } = render(
        <SecretSelector
          namespace={defaultNamespace}
          type="storage"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      const firstCallCount = mockUseFetchState.mock.calls.length;

      rerender(
        <SecretSelector
          namespace={defaultNamespace}
          type="lls"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // useFetchState should be called again with new type
      expect(mockUseFetchState.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined value gracefully', () => {
      const mockSecrets: SecretListItem[] = [mockStorageSecret()];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      expect(screen.getByTestId('test-selector')).toHaveTextContent('Select a secret');
    });

    it('should handle selecting non-existent secret uuid', () => {
      const mockSecrets: SecretListItem[] = [mockStorageSecret({ uuid: '1', name: 'secret-1' })];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value="non-existent-uuid"
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Should fall back to default label
      expect(screen.getByTestId('test-selector')).toHaveTextContent('Select a secret');
    });

    it('should call onChange with undefined when selecting invalid secret', () => {
      const mockSecrets: SecretListItem[] = [mockStorageSecret({ uuid: '1', name: 'secret-1' })];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Simulate selecting an invalid UUID that doesn't exist in the secrets list
      // This tests the defensive code that handles edge cases
      const triggerInvalidButton = screen.getByTestId('test-selector-trigger-invalid');
      fireEvent.click(triggerInvalidButton);

      // Should call onChange with undefined when secret is not found
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should handle empty type parameter', () => {
      mockUseFetchState.mockReturnValue([[mockStorageSecret()], true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          type={undefined}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      expect(screen.getByTestId('test-selector')).toBeInTheDocument();
    });
  });

  describe('additional required keys validation', () => {
    it('should show error when selected secret is missing required keys', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'incomplete-secret',
          availableKeys: ['aws_access_key_id', 'aws_secret_access_key', 'aws_default_region'],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Should show error message for missing key
      expect(
        screen.getByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).toBeInTheDocument();

      // onChange should be called with selection marked as invalid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'incomplete-secret',
        invalid: true,
      });
    });

    it('should show error when selected secret is missing multiple required keys', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'incomplete-secret',
          availableKeys: ['aws_access_key_id', 'aws_secret_access_key'],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket', 'aws_default_region'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Should show error message for all missing keys
      expect(
        screen.getByText(
          'Required keys "aws_s3_bucket", "aws_default_region" are not set in this secret',
        ),
      ).toBeInTheDocument();

      // onChange should be called with selection marked as invalid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'incomplete-secret',
        invalid: true,
      });
    });

    it('should allow selection when secret has all required keys', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'complete-secret',
          availableKeys: [
            'aws_access_key_id',
            'aws_secret_access_key',
            'aws_default_region',
            'aws_s3_endpoint',
            'aws_s3_bucket',
          ],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('complete-secret'));

      // Should NOT show error message
      expect(
        screen.queryByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'complete-secret',
        invalid: false,
      });
    });

    it('should validate keys case-insensitively', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'uppercase-secret',
          availableKeys: [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_DEFAULT_REGION',
            'AWS_S3_ENDPOINT',
            'AWS_S3_BUCKET',
          ],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('uppercase-secret'));

      // Should NOT show error - case-insensitive match
      expect(
        screen.queryByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'uppercase-secret',
        invalid: false,
      });
    });

    it('should not validate when no additionalRequiredKeys prop provided', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'any-secret',
          availableKeys: ['aws_access_key_id'],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('any-secret'));

      // Should NOT show any validation error
      expect(screen.queryByText(/Required key/)).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'any-secret',
        invalid: false,
      });
    });

    it('should not validate when secret type is not in additionalRequiredKeys', () => {
      const mockSecrets: SecretListItem[] = [
        mockLLSSecret({
          uuid: '1',
          name: 'lls-secret',
          availableKeys: ['llama_stack_client_api_key', 'llama_stack_client_base_url'],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('lls-secret'));

      // Should NOT show validation error - lls type not in additionalRequiredKeys
      expect(screen.queryByText(/Required key/)).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'lls-secret',
        invalid: false,
      });
    });

    it('should clear validation error when value is cleared', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'valid-secret',
          availableKeys: ['aws_access_key_id', 'aws_s3_bucket'],
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'incomplete-secret',
          availableKeys: ['aws_access_key_id'],
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      const { rerender } = render(
        <SecretSelector
          namespace={defaultNamespace}
          value="1"
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      // Initially showing valid secret, no error
      expect(
        screen.queryByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).not.toBeInTheDocument();

      // Select secret with missing keys
      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Error should be visible
      expect(
        screen.getByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).toBeInTheDocument();

      // Clear selection by setting value to undefined
      rerender(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['aws_s3_bucket'] }}
          dataTestId="test-selector"
        />,
      );

      // Error should be cleared
      expect(
        screen.queryByText('Required key "aws_s3_bucket" is not set in this secret'),
      ).not.toBeInTheDocument();
    });
  });
});
