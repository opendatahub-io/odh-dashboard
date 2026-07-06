import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useSearchParams } from 'react-router-dom';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import NamespaceUrlSync from '../NamespaceUrlSync';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@perses-dev/dashboards', () => ({
  useVariableDefinitionAndState: jest.fn(),
}));

const useSearchParamsMock = jest.mocked(useSearchParams);
const useVariableDefinitionAndStateMock = jest.mocked(useVariableDefinitionAndState);

describe('NamespaceUrlSync', () => {
  let mockSetSearchParams: jest.Mock;
  let mockSearchParams: URLSearchParams;

  const setupMocks = (
    value: string | string[] | undefined,
    loading = false,
    params = new URLSearchParams(),
  ) => {
    mockSearchParams = params;
    mockSetSearchParams = jest.fn();
    useSearchParamsMock.mockReturnValue([mockSearchParams, mockSetSearchParams]);
    useVariableDefinitionAndStateMock.mockReturnValue({
      definition: undefined,
      state: value !== undefined ? { value, loading } : undefined,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockSetSearchParams = jest.fn();
    useSearchParamsMock.mockReturnValue([mockSearchParams, mockSetSearchParams]);
    // Default mock for useVariableDefinitionAndState
    useVariableDefinitionAndStateMock.mockReturnValue({
      definition: undefined,
      state: undefined,
    });
  });

  describe('rendering', () => {
    it('should render nothing (null)', () => {
      // Uses default mock from beforeEach (state: undefined)
      const { container } = render(<NamespaceUrlSync />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('initial render behavior', () => {
    it('should not update URL on initial render', () => {
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'test-namespace',
          loading: false,
        },
      });

      render(<NamespaceUrlSync />);

      // On first render, it should just record the value without updating URL
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });

    it('should not update URL when loading', () => {
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'test-namespace',
          loading: true,
        },
      });

      render(<NamespaceUrlSync />);

      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });

    it('should not update URL when value is undefined or state is undefined', () => {
      // Both cases hit the same early return: !namespaceState?.value
      // Test with state.value undefined
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: undefined as unknown as string,
          loading: false,
        },
      });

      const { rerender } = render(<NamespaceUrlSync />);
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Test with state itself undefined (uses default from beforeEach)
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: undefined,
      });

      rerender(<NamespaceUrlSync />);
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });

  describe('syncing namespace value to URL', () => {
    it('should update URL when namespace value changes after initial render', async () => {
      // Start with initial value
      setupMocks('initial-namespace');
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes, no URL update
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Change namespace value
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'new-namespace',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });

      // Verify the callback function updates params correctly
      const callbackFn = mockSetSearchParams.mock.calls[0][0];
      const newParams = callbackFn(new URLSearchParams());
      expect(newParams.get('var-namespace')).toBe('new-namespace');
    });

    it('should handle array values by joining with comma', async () => {
      // Start with initial value
      setupMocks('initial');
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes, no URL update
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Change to array value
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: ['namespace-1', 'namespace-2'],
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });

      const callbackFn = mockSetSearchParams.mock.calls[0][0];
      const newParams = callbackFn(new URLSearchParams());
      expect(newParams.get('var-namespace')).toBe('namespace-1,namespace-2');
    });

    it('should not update URL when value has not changed', () => {
      // Start with a value
      setupMocks('same-namespace');
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes, no URL update
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Rerender with same value (mock already returns same value)
      rerender(<NamespaceUrlSync />);

      // Should not have been called because value didn't change
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });

    it('should not update URL when URL already has the same value', () => {
      // URL already has the namespace value, start with different initial value
      setupMocks('initial-value', false, new URLSearchParams('var-namespace=existing-namespace'));
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes with 'initial-value', no URL update
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Change to the same value that's already in URL
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'existing-namespace',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      // Should not update because URL already has this value
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });

  describe('$__all value handling', () => {
    it('should remove namespace param when value is $__all', async () => {
      // Start with specific namespace
      setupMocks('specific-namespace');
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Change to $__all
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: '$__all',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });

      // Verify the callback removes the param
      const callbackFn = mockSetSearchParams.mock.calls[0][0];
      const existingParams = new URLSearchParams('var-namespace=old-value');
      const newParams = callbackFn(existingParams);
      expect(newParams.has('var-namespace')).toBe(false);
    });

    it('should not sync when value becomes empty (falsy values are ignored)', () => {
      // Start with specific namespace
      setupMocks('specific-namespace');
      const { rerender } = render(<NamespaceUrlSync />);

      // First render initializes
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Change to empty string - component treats empty as falsy and returns early
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: '',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      // Should not call setSearchParams because empty string is treated as falsy
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });

  describe('URL update options', () => {
    it('should use replace: true when updating URL', async () => {
      // Start with initial value
      setupMocks('initial');
      const { rerender } = render(<NamespaceUrlSync />);

      // Change value
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'new-value',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function), { replace: true });
      });
    });

    it('should preserve other query params when updating namespace', async () => {
      // Start with initial value
      setupMocks('initial');
      const { rerender } = render(<NamespaceUrlSync />);

      // Change value
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: {
          value: 'new-namespace',
          loading: false,
        },
      });
      rerender(<NamespaceUrlSync />);

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });

      // Verify other params are preserved
      const callbackFn = mockSetSearchParams.mock.calls[0][0];
      const existingParams = new URLSearchParams('other-param=value&dashboard=test');
      const newParams = callbackFn(existingParams);
      expect(newParams.get('var-namespace')).toBe('new-namespace');
      expect(newParams.get('other-param')).toBe('value');
      expect(newParams.get('dashboard')).toBe('test');
    });
  });

  describe('hook call', () => {
    it('should call useVariableDefinitionAndState with namespace', () => {
      useVariableDefinitionAndStateMock.mockReturnValue({
        definition: undefined,
        state: undefined,
      });

      render(<NamespaceUrlSync />);

      expect(useVariableDefinitionAndStateMock).toHaveBeenCalledWith('namespace');
    });
  });
});
