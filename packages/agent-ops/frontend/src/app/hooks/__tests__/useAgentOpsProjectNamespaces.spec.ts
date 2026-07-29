import { act } from '@testing-library/react';
import { useNamespaceSelector } from 'mod-arch-core';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import {
  getEffectiveProjectNamespaces,
  useAgentOpsProjectNamespaces,
} from '~/app/hooks/useAgentOpsProjectNamespaces';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('~/odh/context/ProjectsBridgeContext', () => ({
  useProjectsBridge: jest.fn(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

const mockUseProjectsBridge = jest.mocked(useProjectsBridge);
const mockUseNamespaceSelector = jest.mocked(useNamespaceSelector);

const inactiveBridge = {
  bridgeActive: false as const,
  projects: [],
  preferredProject: null,
  updatePreferredProject: jest.fn(),
  loaded: false,
  loadError: null,
};

describe('useAgentOpsProjectNamespaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectsBridge.mockReturnValue(inactiveBridge);
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'team1', displayName: 'Team 1' }],
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    });
  });

  describe('getEffectiveProjectNamespaces', () => {
    const team1 = [{ name: 'team1', displayName: 'team1' }];

    it('returns project list when non-empty', () => {
      expect(getEffectiveProjectNamespaces(team1, false, 'fallback')).toEqual(team1);
      expect(getEffectiveProjectNamespaces(team1, true, 'fallback')).toEqual(team1);
    });

    it('synthesizes fallback namespace only while loading', () => {
      expect(getEffectiveProjectNamespaces([], true, 'team1')).toEqual([
        { name: 'team1', displayName: 'team1' },
      ]);
    });

    it('returns empty list when loaded with no projects', () => {
      expect(getEffectiveProjectNamespaces([], false, 'team1')).toEqual([]);
    });

    it('returns empty list when loaded with no fallback', () => {
      expect(getEffectiveProjectNamespaces([], false)).toEqual([]);
      expect(getEffectiveProjectNamespaces([], true)).toEqual([]);
    });
  });

  it('uses namespace selector projects when bridge is inactive', () => {
    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.projectNamespaces).toEqual([{ name: 'team1', displayName: 'Team 1' }]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeNull();
  });

  it('uses bridged projects when bridge is active and loaded', () => {
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [{ name: 'bridge-ns', displayName: 'Bridge NS' }],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      loaded: true,
      loadError: null,
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.projectNamespaces).toEqual([
      { name: 'bridge-ns', displayName: 'Bridge NS' },
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty list while bridge is loading', () => {
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      loaded: false,
      loadError: null,
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.projectNamespaces).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces bridge load errors', () => {
    const bridgeError = new Error('Bridge failed');
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      loaded: false,
      loadError: bridgeError,
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.loadError).toBe(bridgeError);
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces bridge crash errors when bridgeActive is false', () => {
    const crashError = new Error('Bridge crashed');
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: false,
      projects: [],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      loaded: false,
      loadError: crashError,
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.loadError).toBe(crashError);
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces namespace selector load errors when bridge is inactive', () => {
    const namespaceError = new Error('Namespaces failed');
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      namespacesLoaded: false,
      namespacesLoadError: namespaceError,
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    expect(result.current.loadError).toBe(namespaceError);
    expect(result.current.isLoading).toBe(false);
  });

  it('calls updatePreferredProject when bridge is active', () => {
    const updatePreferredProject = jest.fn();
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [{ name: 'bridge-ns', displayName: 'Bridge NS' }],
      preferredProject: null,
      updatePreferredProject,
      loaded: true,
      loadError: null,
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    act(() => {
      result.current.onProjectSelection('bridge-ns');
    });

    expect(updatePreferredProject).toHaveBeenCalledWith({ name: 'bridge-ns' });
  });

  it('calls updatePreferredNamespace when bridge is inactive', () => {
    const updatePreferredNamespace = jest.fn();
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'team1', displayName: 'Team 1' }],
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      preferredNamespace: undefined,
      updatePreferredNamespace,
      clearStoredNamespace: jest.fn(),
    });

    const { result } = testHook(useAgentOpsProjectNamespaces)();

    act(() => {
      result.current.onProjectSelection('team1');
    });

    expect(updatePreferredNamespace).toHaveBeenCalledWith({
      name: 'team1',
      displayName: 'Team 1',
    });
  });
});
