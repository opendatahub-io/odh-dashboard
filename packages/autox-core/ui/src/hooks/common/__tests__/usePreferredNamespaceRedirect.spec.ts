import { renderHook } from '@testing-library/react';
import { useNavigate, useParams } from 'react-router';
import { usePreferredNamespaceRedirect } from '../usePreferredNamespaceRedirect';
import { useNamespaceSelectorWithPersistence } from '../useNamespaceSelectorWithPersistence';

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

const useNavigateMock = jest.mocked(useNavigate);
const useParamsMock = jest.mocked(useParams);
const useNamespaceSelectorWithPersistenceMock = jest.mocked(useNamespaceSelectorWithPersistence);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asNamespaceSelectorResult = (value: unknown): any => value;

describe('usePreferredNamespaceRedirect', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigateMock.mockReturnValue(mockNavigate);
  });

  it('should redirect to the preferred namespace when no namespace param is set', () => {
    useParamsMock.mockReturnValue({});
    useNamespaceSelectorWithPersistenceMock.mockReturnValue(
      asNamespaceSelectorResult({
        namespaces: [{ name: 'ns-1' }, { name: 'ns-2' }],
        preferredNamespace: { name: 'ns-2' },
      }),
    );

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledWith('ns-2', { replace: true });
  });

  it('should redirect to the first namespace when the preferred namespace is not in the list', () => {
    useParamsMock.mockReturnValue({});
    useNamespaceSelectorWithPersistenceMock.mockReturnValue(
      asNamespaceSelectorResult({
        namespaces: [{ name: 'ns-1' }, { name: 'ns-2' }],
        preferredNamespace: { name: 'stale-ns' },
      }),
    );

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).toHaveBeenCalledWith('ns-1', { replace: true });
  });

  it('should not redirect when a namespace param is already set', () => {
    useParamsMock.mockReturnValue({ namespace: 'current-ns' });
    useNamespaceSelectorWithPersistenceMock.mockReturnValue(
      asNamespaceSelectorResult({
        namespaces: [{ name: 'ns-1' }],
        preferredNamespace: undefined,
      }),
    );

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect when there are no namespaces to redirect to', () => {
    useParamsMock.mockReturnValue({});
    useNamespaceSelectorWithPersistenceMock.mockReturnValue(
      asNamespaceSelectorResult({
        namespaces: [],
        preferredNamespace: undefined,
      }),
    );

    renderHook(() => usePreferredNamespaceRedirect());

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
