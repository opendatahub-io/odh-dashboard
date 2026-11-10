import * as React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatusError, type HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { HardwareProfileModel } from '@odh-dashboard/k8s-core/api/models';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import {
  HardwareProfilesContext,
  HardwareProfilesContextProvider,
  useWatchHardwareProfiles,
} from '../HardwareProfilesContext';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(),
}));

const mockUseK8sWatchResource = jest.mocked(useK8sWatchResource);

const HardwareProfilesConsumer: React.FC = () => {
  const {
    globalHardwareProfiles: [profiles, loaded, error],
  } = React.useContext(HardwareProfilesContext);

  return (
    <span data-testid="hardware-profile-state">
      {error?.message ??
        (loaded ? profiles.map((profile) => profile.metadata.name).join(',') : 'loading')}
    </span>
  );
};

describe('HardwareProfilesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
  });

  it('should update the watch when the dashboard namespace changes', () => {
    const { rerender } = renderHook(({ namespace }) => useWatchHardwareProfiles(namespace), {
      initialProps: { namespace: 'opendatahub' },
    });

    const expectedResource = {
      isList: true,
      groupVersionKind: {
        group: 'infrastructure.opendatahub.io',
        version: 'v1',
        kind: 'HardwareProfile',
      },
      namespace: 'opendatahub',
    };
    expect(mockUseK8sWatchResource).toHaveBeenLastCalledWith(
      expectedResource,
      HardwareProfileModel,
      undefined,
    );

    rerender({ namespace: 'redhat-ods-applications' });

    expect(mockUseK8sWatchResource).toHaveBeenLastCalledWith(
      { ...expectedResource, namespace: 'redhat-ods-applications' },
      HardwareProfileModel,
      undefined,
    );
  });

  it.each([undefined, ''])('should disable the watch for namespace %s', (namespace) => {
    renderHook(() => useWatchHardwareProfiles(namespace));

    expect(mockUseK8sWatchResource).toHaveBeenCalledWith(null, HardwareProfileModel, undefined);
  });

  it('should preserve an empty list across renders before the SDK returns data', () => {
    // @ts-expect-error The SDK initializes without data despite excluding undefined from its type.
    mockUseK8sWatchResource.mockReturnValue([undefined, false, undefined]);
    const { result, rerender } = renderHook(() => useWatchHardwareProfiles('opendatahub'));
    const profiles = result.current[0];

    rerender();

    expect(result.current).toEqual([[], false, undefined]);
    expect(result.current[0]).toBe(profiles);
  });

  it('should provide profiles and loading state from Kubernetes', () => {
    const profiles: HardwareProfileKind[] = [
      {
        apiVersion: 'infrastructure.opendatahub.io/v1',
        kind: 'HardwareProfile',
        metadata: { name: 'default-profile', namespace: 'opendatahub' },
        spec: { identifiers: [] },
      },
    ];
    mockUseK8sWatchResource.mockReturnValue([[], false, undefined]);
    const view = () => (
      <HardwareProfilesContextProvider namespace="opendatahub">
        <HardwareProfilesConsumer />
      </HardwareProfilesContextProvider>
    );
    const { rerender } = render(view());
    expect(screen.getByTestId('hardware-profile-state')).toHaveTextContent('loading');

    mockUseK8sWatchResource.mockReturnValue([profiles, true, undefined]);
    rerender(view());

    expect(screen.getByTestId('hardware-profile-state')).toHaveTextContent('default-profile');
  });

  it('should expose a Kubernetes permission error to consumers', () => {
    const status = mock403Error({});
    mockUseK8sWatchResource.mockReturnValue([[], false, status]);

    const { result } = renderHook(() => React.useContext(HardwareProfilesContext), {
      wrapper: ({ children }) => (
        <HardwareProfilesContextProvider namespace="opendatahub">
          {children}
        </HardwareProfilesContextProvider>
      ),
    });

    expect(result.current.globalHardwareProfiles[2]).toBeInstanceOf(K8sStatusError);
    expect(result.current.globalHardwareProfiles[2]?.message).toBe(status.message);
  });
});
