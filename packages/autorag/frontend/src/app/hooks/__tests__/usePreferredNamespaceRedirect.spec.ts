import { renderHook } from '@testing-library/react';
import { useNavigate, useParams } from 'react-router';
import { useNamespaceSelector } from 'mod-arch-core';
import type { Namespace } from 'mod-arch-core';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';

// Mock dependencies
jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);
const mockUseNamespaceSelector = jest.mocked(useNamespaceSelector);

describe('usePreferredNamespaceRedirect', () => {
  const mockNavigate = jest.fn();

  const createMockNamespace = (name: string): Namespace => ({
    name,
    displayName: name,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);
  });

  it('should not navigate when namespace is already in URL', () => {
    mockUseParams.mockReturnValue({ namespace: 'current-namespace' });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('namespace-1'), createMockNamespace('namespace-2')],
      preferredNamespace: createMockNamespace('namespace-1'),
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to preferred namespace when no namespace in URL', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('namespace-1'), createMockNamespace('namespace-2')],
      preferredNamespace: createMockNamespace('namespace-1'),
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('namespace-1', { replace: true });
  });

  it('should navigate to first namespace when no preferred namespace and no namespace in URL', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('first-namespace'), createMockNamespace('second-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('first-namespace', { replace: true });
  });

  it('should not navigate when no namespaces are available', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to first namespace when preferred namespace is invalid', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('valid-namespace')],
      preferredNamespace: createMockNamespace('invalid-namespace'), // Not in namespaces list
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('valid-namespace', { replace: true });
  });

  it('should use valid preferred namespace when it exists in namespaces list', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    const preferredNs = createMockNamespace('preferred-namespace');
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [
        createMockNamespace('other-namespace'),
        preferredNs,
        createMockNamespace('another-namespace'),
      ],
      preferredNamespace: preferredNs,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('preferred-namespace', { replace: true });
  });

  it('should use replace navigation mode', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('test-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledWith('test-namespace', { replace: true });
  });

  it('should handle undefined preferred namespace', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('first-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('first-namespace', { replace: true });
  });

  it('should re-run effect when namespace param changes', () => {
    // Set up initial state BEFORE rendering
    mockUseParams.mockReturnValue({ namespace: undefined });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('test-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    const { rerender } = renderHook(() => usePreferredNamespaceRedirect());

    // Initial render should navigate because no namespace in URL
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('test-namespace', { replace: true });

    // Update to have namespace in URL
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    rerender();

    // Should not navigate again because namespace is now present
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should re-run effect when namespaces list changes', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });

    // Initial render with empty namespaces
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    const { rerender } = renderHook(() => usePreferredNamespaceRedirect());
    expect(mockNavigate).not.toHaveBeenCalled();

    // Update with namespaces available
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('new-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    rerender();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('new-namespace', { replace: true });
  });

  it('should re-run effect when preferred namespace changes', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });

    const namespace1 = createMockNamespace('namespace-1');
    const namespace2 = createMockNamespace('namespace-2');

    // Initial render with namespace-1 as preferred
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [namespace1, namespace2],
      preferredNamespace: namespace1,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    const { rerender } = renderHook(() => usePreferredNamespaceRedirect());
    expect(mockNavigate).toHaveBeenCalledWith('namespace-1', { replace: true });

    // Update preferred namespace to namespace-2
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [namespace1, namespace2],
      preferredNamespace: namespace2,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    rerender();
    expect(mockNavigate).toHaveBeenCalledWith('namespace-2', { replace: true });
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('should handle empty string namespace in URL', () => {
    mockUseParams.mockReturnValue({ namespace: '' });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('test-namespace')],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    // Empty string is falsy, so should navigate
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('test-namespace', { replace: true });
  });

  it('should pass storeLastNamespace option to useNamespaceSelector', () => {
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [createMockNamespace('test-namespace')],
      preferredNamespace: createMockNamespace('test-namespace'),
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockUseNamespaceSelector).toHaveBeenCalledWith({ storeLastNamespace: true });
  });
});
