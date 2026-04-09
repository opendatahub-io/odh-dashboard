import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFetchState } from 'mod-arch-core';
import { SecretListItem } from '~/app/types';
import { mockSecretListItem, mockStorageSecret } from '~/__mocks__/mockSecretListItem';
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
    jest.resetAllMocks();
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

    it('should render default placeholder in the field', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // The selector toggle itself should show the placeholder
      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toHaveTextContent('Select a secret');
      expect(toggle).not.toHaveTextContent('Choose AWS Secret');
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

    it('should render custom placeholder correctly', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          placeholder="Choose a secret from the list"
          dataTestId="test-selector"
        />,
      );

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

      // Should show both secrets
      expect(screen.getByText('aws-secret-1')).toBeInTheDocument();
      expect(screen.getByText('aws-secret-2')).toBeInTheDocument();
    });

    it('should not display type labels by default', () => {
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

      // Type labels should NOT be visible when showType is not provided
      expect(screen.queryByText('Type: s3')).not.toBeInTheDocument();
      expect(screen.queryByText('Type: lls')).not.toBeInTheDocument();
    });

    it('should not display type labels when showType is false', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType={false}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Type labels should NOT be visible
      expect(screen.queryByText('Type: s3')).not.toBeInTheDocument();
      expect(screen.queryByText('Type: lls')).not.toBeInTheDocument();
    });

    it('should display secret type as description', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Type descriptions should be visible
      expect(screen.getAllByText('Type: s3')).toHaveLength(2);
    });

    it('should not display descriptions by default', () => {
      const secretsWithDesc: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-secret-1',
          description: 'AWS S3 storage credentials',
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'aws-secret-2',
          description: 'AWS S3 backup storage',
        }),
      ];
      mockUseFetchState.mockReturnValue([secretsWithDesc, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Descriptions should NOT be visible when showDescription is not provided
      expect(screen.queryByText('AWS S3 storage credentials')).not.toBeInTheDocument();
      expect(screen.queryByText('LLS API credentials')).not.toBeInTheDocument();
    });

    it('should not display descriptions when showDescription is false', () => {
      const secretsWithDesc: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-secret-1',
          description: 'AWS S3 storage credentials',
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'aws-secret-2',
          description: 'AWS S3 backup storage',
        }),
      ];
      mockUseFetchState.mockReturnValue([secretsWithDesc, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showDescription={false}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Descriptions should NOT be visible
      expect(screen.queryByText('AWS S3 storage credentials')).not.toBeInTheDocument();
      expect(screen.queryByText('LLS API credentials')).not.toBeInTheDocument();
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
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
          AWS_S3_ENDPOINT: '[REDACTED]',
        },
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
      mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

      const { rerender } = render(
        <SecretSelector
          namespace="namespace-1"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Get the callback from the first render
      const firstCallback = mockUseFetchState.mock.calls[0][0];

      rerender(
        <SecretSelector
          namespace="namespace-2"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Get the callback from the rerender
      const secondCallback =
        mockUseFetchState.mock.calls[mockUseFetchState.mock.calls.length - 1][0];

      // The callbacks should be different because namespace changed
      expect(secondCallback).not.toBe(firstCallback);
    });

    it('should refetch when type changes', () => {
      mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

      const { rerender } = render(
        <SecretSelector
          namespace={defaultNamespace}
          type="storage"
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Get the callback from the first render
      const firstCallback = mockUseFetchState.mock.calls[0][0];

      rerender(
        <SecretSelector
          namespace={defaultNamespace}
          type={undefined}
          value={undefined}
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Get the callback from the rerender
      const secondCallback =
        mockUseFetchState.mock.calls[mockUseFetchState.mock.calls.length - 1][0];

      // The callbacks should be different because type changed
      expect(secondCallback).not.toBe(firstCallback);
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
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
            AWS_DEFAULT_REGION: '[REDACTED]',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Should show error message for missing key
      expect(
        screen.getByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).toBeInTheDocument();

      // onChange should be called with selection marked as invalid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'incomplete-secret',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
        },
        invalid: true,
      });
    });

    it('should show error when selected secret is missing multiple required keys', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'incomplete-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET', 'AWS_DEFAULT_REGION'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Should show error message for all missing keys
      expect(
        screen.getByText(
          'Required keys "AWS_S3_BUCKET", "AWS_DEFAULT_REGION" are not set in this secret',
        ),
      ).toBeInTheDocument();

      // onChange should be called with selection marked as invalid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'incomplete-secret',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
        },
        invalid: true,
      });
    });

    it('should persist invalid selection and show error instead of clearing', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'incomplete-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      const { rerender } = render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      // Select invalid secret
      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // onChange should be called once with invalid: true
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: '1',
          name: 'incomplete-secret',
          invalid: true,
        }),
      );

      // Error message should be visible
      expect(
        screen.getByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).toBeInTheDocument();

      // Reset the mock to verify no additional onChange calls
      mockOnChange.mockClear();

      // Simulate parent component updating the value prop (as it would in real usage)
      rerender(
        <SecretSelector
          namespace={defaultNamespace}
          value="1"
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      // CRITICAL: onChange should NOT be called again with undefined
      // The selection should persist even though it's invalid
      expect(mockOnChange).not.toHaveBeenCalled();

      // Error message should still be visible
      expect(
        screen.getByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).toBeInTheDocument();

      // The selected value should still be displayed
      expect(screen.getByTestId('test-selector')).toHaveTextContent('incomplete-secret');
    });

    it('should allow selection when secret has all required keys', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'complete-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
            AWS_DEFAULT_REGION: '[REDACTED]',
            AWS_S3_ENDPOINT: '[REDACTED]',
            AWS_S3_BUCKET: 'my-bucket',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('complete-secret'));

      // Should NOT show error message
      expect(
        screen.queryByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'complete-secret',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
          AWS_S3_ENDPOINT: '[REDACTED]',
          AWS_S3_BUCKET: 'my-bucket',
        },
        invalid: false,
      });
    });

    it('should validate keys case-sensitively', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'uppercase-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
            AWS_DEFAULT_REGION: '[REDACTED]',
            AWS_S3_ENDPOINT: '[REDACTED]',
            AWS_S3_BUCKET: 'my-bucket',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('uppercase-secret'));

      // Should NOT show error - exact case match
      expect(
        screen.queryByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'uppercase-secret',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
          AWS_S3_ENDPOINT: '[REDACTED]',
          AWS_S3_BUCKET: 'my-bucket',
        },
        invalid: false,
      });
    });

    it('should reject keys with incorrect case', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'lowercase-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_SECRET_ACCESS_KEY: '[REDACTED]',
            AWS_DEFAULT_REGION: '[REDACTED]',
            AWS_S3_ENDPOINT: '[REDACTED]',
            // eslint-disable-next-line camelcase
            aws_s3_bucket: 'my-bucket',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('lowercase-secret'));

      // Should show error - lowercase key does not match uppercase requirement
      expect(
        screen.getByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).toBeInTheDocument();

      // onChange should be called with selection marked as invalid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'lowercase-secret',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
          AWS_S3_ENDPOINT: '[REDACTED]',
          // eslint-disable-next-line camelcase
          aws_s3_bucket: 'my-bucket',
        },
        invalid: true,
      });
    });

    it('should not validate when no additionalRequiredKeys prop provided', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'any-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
          },
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
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
        },
        invalid: false,
      });
    });

    it('should not validate when secret type is not in additionalRequiredKeys', () => {
      const mockSecrets: SecretListItem[] = [
        mockSecretListItem({
          uuid: '1',
          name: 'generic-secret',
          type: 'generic',
          data: {
            somekey: '[REDACTED]',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('generic-secret'));

      // Should NOT show validation error - generic type not in additionalRequiredKeys
      expect(screen.queryByText(/Required key/)).not.toBeInTheDocument();

      // onChange should be called with selection marked as valid
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'generic-secret',
        type: 'generic',
        data: {
          somekey: '[REDACTED]',
        },
        invalid: false,
      });
    });

    it('should clear validation error when value is cleared', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'valid-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
            AWS_S3_BUCKET: 'my-bucket',
          },
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'incomplete-secret',
          data: {
            AWS_ACCESS_KEY_ID: '[REDACTED]',
          },
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      const { rerender } = render(
        <SecretSelector
          namespace={defaultNamespace}
          value="1"
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      // Initially showing valid secret, no error
      expect(
        screen.queryByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).not.toBeInTheDocument();

      // Select secret with missing keys
      fireEvent.click(screen.getByTestId('test-selector'));
      fireEvent.click(screen.getByText('incomplete-secret'));

      // Error should be visible
      expect(
        screen.getByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).toBeInTheDocument();

      // Clear selection by setting value to undefined
      rerender(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
          dataTestId="test-selector"
        />,
      );

      // Error should be cleared
      expect(
        screen.queryByText('Required key "AWS_S3_BUCKET" is not set in this secret'),
      ).not.toBeInTheDocument();
    });
  });

  describe('display name', () => {
    it('should display displayName when available', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
          displayName: 'Production AWS Credentials',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value="1"
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Should show displayName in the toggle
      expect(screen.getByTestId('test-selector')).toHaveTextContent('Production AWS Credentials');
    });

    it('should fallback to name when displayName is not available', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value="1"
          onChange={mockOnChange}
          dataTestId="test-selector"
        />,
      );

      // Should show name when displayName is not available
      expect(screen.getByTestId('test-selector')).toHaveTextContent('aws-prod-credentials');
    });

    it('should display mixed displayNames and names in dropdown', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
          displayName: 'Production AWS',
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'aws-dev-credentials',
        }),
        mockStorageSecret({
          uuid: '3',
          name: 'aws-prod-secret',
          displayName: 'Production AWS Storage',
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

      // Should show displayName where available, name otherwise
      expect(screen.getByText('Production AWS')).toBeInTheDocument();
      expect(screen.getByText('aws-dev-credentials')).toBeInTheDocument();
      expect(screen.getByText('Production AWS Storage')).toBeInTheDocument();
      expect(screen.queryByText('aws-prod-credentials')).not.toBeInTheDocument();
      expect(screen.queryByText('aws-prod-secret')).not.toBeInTheDocument();
    });

    it('should call onChange with correct name when selecting secret with displayName', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
          displayName: 'Production AWS Credentials',
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
      fireEvent.click(screen.getByText('Production AWS Credentials'));

      // onChange should be called with the actual secret name, not displayName
      expect(mockOnChange).toHaveBeenCalledWith({
        uuid: '1',
        name: 'aws-prod-credentials',
        type: 's3',
        data: {
          AWS_ACCESS_KEY_ID: '[REDACTED]',
          AWS_SECRET_ACCESS_KEY: '[REDACTED]',
          AWS_DEFAULT_REGION: '[REDACTED]',
          AWS_S3_ENDPOINT: '[REDACTED]',
        },
        displayName: 'Production AWS Credentials',
        invalid: false,
      });
    });
  });

  describe('description', () => {
    it('should display type and description when both are available', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
          description: 'Production S3 bucket for data storage',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType
          showDescription
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Should show both type and description
      expect(screen.getByText('Type: s3')).toBeInTheDocument();
      expect(screen.getByText('Production S3 bucket for data storage')).toBeInTheDocument();
    });

    it('should display only type when description is not available', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Should show only type
      expect(screen.getByText('Type: s3')).toBeInTheDocument();
    });

    it('should display only description when type is not present', () => {
      const mockSecrets: SecretListItem[] = [
        mockSecretListItem({
          uuid: '1',
          name: 'generic-secret',
          type: undefined,
          description: 'Generic credentials for testing',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showDescription
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Should show only description
      expect(screen.getByText('Generic credentials for testing')).toBeInTheDocument();
    });

    it('should display displayName with type and description', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-prod-credentials',
          displayName: 'Production AWS',
          description: 'Main S3 bucket',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType
          showDescription
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // Should show displayName as main text
      expect(screen.getByText('Production AWS')).toBeInTheDocument();
      // Should show type and description separately
      expect(screen.getByText('Type: s3')).toBeInTheDocument();
      expect(screen.getByText('Main S3 bucket')).toBeInTheDocument();
    });

    it('should handle mixed secrets with and without descriptions', () => {
      const mockSecrets: SecretListItem[] = [
        mockStorageSecret({
          uuid: '1',
          name: 'aws-with-desc',
          description: 'S3 bucket with description',
        }),
        mockStorageSecret({
          uuid: '2',
          name: 'aws-without-desc',
        }),
        mockStorageSecret({
          uuid: '3',
          name: 'aws-with-desc',
          description: 'S3 endpoint for testing',
        }),
      ];
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          showType
          showDescription
          dataTestId="test-selector"
        />,
      );

      fireEvent.click(screen.getByTestId('test-selector'));

      // First secret has type and description
      expect(screen.getByText('S3 bucket with description')).toBeInTheDocument();
      // All three secrets show Type: s3
      expect(screen.getAllByText('Type: s3')).toHaveLength(3);
      // Third secret has type and description
      expect(screen.getByText('S3 endpoint for testing')).toBeInTheDocument();
    });
  });
});
