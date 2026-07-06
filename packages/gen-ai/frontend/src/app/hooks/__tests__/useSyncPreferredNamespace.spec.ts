// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useModularArchContext, Namespace } from 'mod-arch-core';
import useSyncPreferredNamespace from '~/app/hooks/useSyncPreferredNamespace';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useModularArchContext: jest.fn(),
}));

const mockUseModularArchContext = jest.mocked(useModularArchContext);

describe('useSyncPreferredNamespace', () => {
  const mockUpdatePreferredNamespace = jest.fn();

  const mockNamespace1: Namespace = {
    name: 'test-namespace-1',
    displayName: 'Test Namespace 1',
  };

  const mockNamespace2: Namespace = {
    name: 'test-namespace-2',
    displayName: 'Test Namespace 2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModularArchContext.mockReturnValue({
      preferredNamespace: undefined,
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('should call updatePreferredNamespace when namespace changes from undefined to defined', () => {
    testHook(useSyncPreferredNamespace)(mockNamespace1);

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith(mockNamespace1);
    expect(mockUpdatePreferredNamespace).toHaveBeenCalledTimes(1);
  });

  it('should call updatePreferredNamespace when namespace changes from defined to different namespace', () => {
    mockUseModularArchContext.mockReturnValue({
      preferredNamespace: mockNamespace1,
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { rerender } = testHook(useSyncPreferredNamespace)(mockNamespace1);

    // Initial render should not trigger update since namespaces are the same
    expect(mockUpdatePreferredNamespace).not.toHaveBeenCalled();

    // Change to different namespace
    rerender(mockNamespace2);

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith(mockNamespace2);
    expect(mockUpdatePreferredNamespace).toHaveBeenCalledTimes(1);
  });

  it('should call updatePreferredNamespace when namespace changes from defined to undefined', () => {
    mockUseModularArchContext.mockReturnValue({
      preferredNamespace: mockNamespace1,
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    testHook(useSyncPreferredNamespace)(undefined);

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith(undefined);
    expect(mockUpdatePreferredNamespace).toHaveBeenCalledTimes(1);
  });

  it('should not call updatePreferredNamespace when namespaces have the same name', () => {
    const sameNameNamespace: Namespace = {
      name: 'test-namespace-1',
      displayName: 'Different Display Name',
    };

    mockUseModularArchContext.mockReturnValue({
      preferredNamespace: mockNamespace1,
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    testHook(useSyncPreferredNamespace)(sameNameNamespace);

    expect(mockUpdatePreferredNamespace).not.toHaveBeenCalled();
  });

  it('should not call updatePreferredNamespace when both namespaces are undefined', () => {
    testHook(useSyncPreferredNamespace)(undefined);

    expect(mockUpdatePreferredNamespace).not.toHaveBeenCalled();
  });

  it('should handle multiple namespace changes correctly', () => {
    const { rerender } = testHook(useSyncPreferredNamespace)(mockNamespace1);

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith(mockNamespace1);

    rerender(mockNamespace2);
    expect(mockUpdatePreferredNamespace).toHaveBeenCalledWith(mockNamespace2);

    expect(mockUpdatePreferredNamespace).toHaveBeenCalledTimes(2);
  });
});
