import React, { act } from 'react';
import { render } from '@testing-library/react';
import type { LoadedExtension, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { HookNotify, useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type {
  ClusterStorageConnectedResources,
  ClusterStorageConnectedResourcesExtension,
  ConnectedResourceLabel,
} from '@odh-dashboard/plugin-core/extension-points';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useClusterStorageConnectedResources } from '#~/pages/projects/screens/detail/storage/useClusterStorageConnectedResources';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
  useResolvedExtensions: jest.fn(),
  // Render nothing — tests drive onNotify/onUnmount directly off the captured props.
  HookNotify: jest.fn(() => null),
}));

const mockUseExtensions = jest.mocked(useExtensions);
const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);
const mockHookNotify = jest.mocked(HookNotify);

const project = mockProjectK8sResource({});
const pvc = mockPVCK8sResource({});

const makeExtension = (
  uid: string,
  getConnectedResources: (
    pvc: PersistentVolumeClaimKind,
    data: unknown,
  ) => ConnectedResourceLabel[] = () => [],
): LoadedExtension<ResolvedExtension<ClusterStorageConnectedResourcesExtension>> => ({
  type: 'app.cluster-storage/connected-resources',
  uid,
  pluginName: 'test',
  properties: {
    useConnectedResources: jest.fn(),
    getConnectedResources,
  },
});

// useExtensions only needs a length, so any valid extension shape works.
const unresolved = (count: number): LoadedExtension[] =>
  Array.from({ length: count }, (_, i) => makeExtension(`unresolved-${i}`));

describe('useClusterStorageConnectedResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report no extensions and be loaded when nothing is contributed', () => {
    mockUseExtensions.mockReturnValue([]);
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    const { result } = testHook(useClusterStorageConnectedResources)(project);

    expect(result.current.hasExtensions).toBe(false);
    expect(result.current.loaded).toBe(true);
    expect(result.current.getConnectedResourceLabels(pvc)).toEqual([]);
    expect(result.current.hookNotifications).toEqual([]);
  });

  it('should not be loaded while resolution is pending', () => {
    mockUseExtensions.mockReturnValue(unresolved(1));
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);

    const { result } = testHook(useClusterStorageConnectedResources)(project);

    expect(result.current.hasExtensions).toBe(true);
    expect(result.current.loaded).toBe(false);
  });

  it('should stay unloaded until every extension hook reports loaded', () => {
    mockUseExtensions.mockReturnValue(unresolved(1));
    mockUseResolvedExtensions.mockReturnValue([[makeExtension('a')], true, []]);

    const { result } = testHook(useClusterStorageConnectedResources)(project);

    // No hook has notified yet, so the extension's data is missing → not loaded.
    expect(result.current.loaded).toBe(false);
  });

  it('should render one HookNotify per resolved extension', () => {
    const extensions = [makeExtension('a'), makeExtension('b')];
    mockUseExtensions.mockReturnValue(unresolved(2));
    mockUseResolvedExtensions.mockReturnValue([extensions, true, []]);

    const { result } = testHook(useClusterStorageConnectedResources)(project);

    expect(result.current.hookNotifications).toHaveLength(2);
  });

  it('should become loaded and merge labels once every hook notifies', () => {
    const labelA: ConnectedResourceLabel = { key: 'a', title: 'Model A', kind: 'connected-models' };
    const labelB: ConnectedResourceLabel = { key: 'b', title: 'Model B', kind: 'connected-models' };
    const extensions = [makeExtension('a', () => [labelA]), makeExtension('b', () => [labelB])];
    mockUseExtensions.mockReturnValue(unresolved(2));
    mockUseResolvedExtensions.mockReturnValue([extensions, true, []]);

    const renderResult = testHook(useClusterStorageConnectedResources)(project);

    // Render the HookNotify elements so their props (onNotify) are captured.
    render(<>{renderResult.result.current.hookNotifications}</>);

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.getConnectedResourceLabels(pvc)).toEqual([]);

    // `key` is stripped from props by React, so match extensions by their (unique) hook ref.
    const notify = (
      extension: (typeof extensions)[number],
      value: ClusterStorageConnectedResources,
    ) => {
      const call = mockHookNotify.mock.calls.find(
        ([props]) => props.useHook === extension.properties.useConnectedResources,
      );
      act(() => call?.[0].onNotify?.(value));
    };

    notify(extensions[0], { loaded: true, data: {} });
    // Only one of two extensions has loaded.
    expect(renderResult.result.current.loaded).toBe(false);

    notify(extensions[1], { loaded: true, data: {} });
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.getConnectedResourceLabels(pvc)).toEqual([labelA, labelB]);
  });

  it('should skip extensions whose hook has unmounted', () => {
    const label: ConnectedResourceLabel = { key: 'a', title: 'Model A', kind: 'connected-models' };
    const extensions = [makeExtension('a', () => [label])];
    mockUseExtensions.mockReturnValue(unresolved(1));
    mockUseResolvedExtensions.mockReturnValue([extensions, true, []]);

    const renderResult = testHook(useClusterStorageConnectedResources)(project);
    render(<>{renderResult.result.current.hookNotifications}</>);

    const props = mockHookNotify.mock.calls.find(
      ([p]) => p.useHook === extensions[0].properties.useConnectedResources,
    )?.[0];

    act(() => props?.onNotify?.({ loaded: true, data: {} }));
    expect(renderResult.result.current.getConnectedResourceLabels(pvc)).toEqual([label]);

    act(() => props?.onUnmount?.());
    // Data cleared → no labels and no longer loaded.
    expect(renderResult.result.current.getConnectedResourceLabels(pvc)).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should pass the project to each extension hook', () => {
    const extensions = [makeExtension('a')];
    mockUseExtensions.mockReturnValue(unresolved(1));
    mockUseResolvedExtensions.mockReturnValue([extensions, true, []]);

    const otherProject: ProjectKind = mockProjectK8sResource({ k8sName: 'other' });
    const renderResult = testHook(useClusterStorageConnectedResources)(otherProject);
    render(<>{renderResult.result.current.hookNotifications}</>);

    const props = mockHookNotify.mock.calls.find(
      ([p]) => p.useHook === extensions[0].properties.useConnectedResources,
    )?.[0];
    expect(props?.useHook).toBe(extensions[0].properties.useConnectedResources);
    expect(props?.args).toEqual([otherProject]);
  });
});
