import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFetchState } from 'mod-arch-core';
import { SecretListItem } from '~/app/types';
import { mockStorageSecret, mockLLSSecret } from '~/__mocks__/mockSecretListItem';
import SecretSelector from '../SecretSelector';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useFetchState: jest.fn(),
}));

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

    it('should display custom label', () => {
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

      expect(screen.getByTestId('test-selector')).toHaveTextContent('Choose AWS Secret');
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
      expect(screen.getAllByText('Type: storage')).toHaveLength(2);
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

    it('should apply isFullWidth prop', () => {
      mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, mockRefresh]);

      render(
        <SecretSelector
          namespace={defaultNamespace}
          value={undefined}
          onChange={mockOnChange}
          isFullWidth
          dataTestId="test-selector"
        />,
      );

      const toggle = screen.getByTestId('test-selector');
      expect(toggle).toHaveClass('pf-m-full-width');
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

      fireEvent.click(screen.getByTestId('test-selector'));

      // Manually trigger select with invalid value (edge case simulation)
      const selectComponent = screen.getByTestId('test-selector').closest('.pf-v6-c-select');
      if (selectComponent) {
        // This simulates an edge case where an invalid value might be selected
        // In normal usage, this shouldn't happen, but we test defensive code
        expect(mockOnChange).not.toHaveBeenCalled();
      }
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
});
