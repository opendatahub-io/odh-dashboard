// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useModularArchContext, Namespace } from 'mod-arch-core';
import * as preferredProjectStorage from '@odh-dashboard/internal/concepts/projects/preferredProjectStorage';
import useSyncPreferredNamespace from '~/app/hooks/useSyncPreferredNamespace';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useModularArchContext: jest.fn(),
}));

// Mock the preferredProjectStorage module
jest.mock('@odh-dashboard/internal/concepts/projects/preferredProjectStorage', () => ({
  PREFERRED_PROJECT_STORAGE_KEY: 'odh.dashboard.preferredProject',
  setPreferredProject: jest.fn(),
  getPreferredProject: jest.fn(),
  clearPreferredProject: jest.fn(),
}));

const mockUseModularArchContext = jest.mocked(useModularArchContext);
const mockSetPreferredProject = jest.mocked(preferredProjectStorage.setPreferredProject);

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
    mockSetPreferredProject.mockClear();
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

  it('should call setPreferredProject when namespace changes', () => {
    testHook(useSyncPreferredNamespace)(mockNamespace1);

    expect(mockSetPreferredProject).toHaveBeenCalledWith('test-namespace-1');
    expect(mockSetPreferredProject).toHaveBeenCalledTimes(1);
  });

  it('should not call setPreferredProject when namespace is undefined', () => {
    mockUseModularArchContext.mockReturnValue({
      preferredNamespace: mockNamespace1,
      updatePreferredNamespace: mockUpdatePreferredNamespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    testHook(useSyncPreferredNamespace)(undefined);

    expect(mockSetPreferredProject).not.toHaveBeenCalled();
  });

  it('should call setPreferredProject on each namespace change', () => {
    const { rerender } = testHook(useSyncPreferredNamespace)(mockNamespace1);

    expect(mockSetPreferredProject).toHaveBeenCalledWith('test-namespace-1');

    rerender(mockNamespace2);
    expect(mockSetPreferredProject).toHaveBeenCalledWith('test-namespace-2');
    expect(mockSetPreferredProject).toHaveBeenCalledTimes(2);
  });
});
