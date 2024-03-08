import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';
import { assemblePodSpecOptions, getshmVolume, getshmVolumeMount } from '~/api/k8s/utils';
import { ContainerResources, TolerationEffect, TolerationOperator } from '~/types';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assemblePodSpecOptions', () => {
  const resourceSettings: ContainerResources = {
    limits: { cpu: '1', memory: '1Gi' },
    requests: { cpu: '0.5', memory: '500Mi' },
  };
  const tolerationsMock = [
    {
      effect: 'NoSchedule',
      key: 'nvidia.com/gpu',
      operator: 'Exists',
    },
  ];

  it('should assemble pod spec options correctly when resourceSetting and acceleratorProfileState is given', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMock,
      acceleratorProfiles: [acceleratorProfileMock],
      initialAcceleratorProfile: acceleratorProfileMock,
      count: 1,
      additionalOptions: {},
      useExisting: false,
    };
    const result = assemblePodSpecOptions(resourceSettings, acceleratorProfileState);
    expect(result).toStrictEqual({
      affinity: {},
      tolerations: tolerationsMock,
      resources: {
        limits: {
          cpu: '1',
          memory: '1Gi',
          'nvidia.com/gpu': 1,
        },
        requests: {
          cpu: '0.5',
          memory: '500Mi',
          'nvidia.com/gpu': 1,
        },
      },
    });
  });

  it('should assemble pod spec correctly with useExisting parameter set as false and affinitySettings given ', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const affinitySettings = { nodeAffinity: { key: 'value' } };
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMock,
      acceleratorProfiles: [acceleratorProfileMock],
      initialAcceleratorProfile: acceleratorProfileMock,
      count: 1,
      additionalOptions: { useExisting: true },
      useExisting: false,
    };

    const existingResources = {
      limits: { cpu: '0', memory: '0Gi' },
      requests: { cpu: '0.5', memory: '500Mi' },
    };

    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      undefined,
      undefined,
      affinitySettings,
      existingResources,
    );
    expect(result).toStrictEqual({
      affinity: {
        nodeAffinity: {
          key: 'value',
        },
      },
      tolerations: tolerationsMock,
      resources: {
        limits: { cpu: '1', memory: '1Gi', 'nvidia.com/gpu': 1 },
        requests: { cpu: '0.5', memory: '500Mi', 'nvidia.com/gpu': 1 },
      },
    });
  });

  it('should assemble correctly with toleration setting enabled and existing toleration given', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const tolerationSettings = { enabled: true, key: 'existing-key' };
    const existingTolerations = [
      {
        key: 'existing-key',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
    ];
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMock,
      acceleratorProfiles: [acceleratorProfileMock],
      initialAcceleratorProfile: acceleratorProfileMock,
      count: 1,
      additionalOptions: {},
      useExisting: true,
    };

    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      tolerationSettings,
      existingTolerations,
    );
    expect(result).toStrictEqual({
      affinity: {},
      resources: {
        limits: {
          cpu: '1',
          memory: '1Gi',
          'nvidia.com/gpu': 1,
        },
        requests: {
          cpu: '0.5',
          memory: '500Mi',
          'nvidia.com/gpu': 1,
        },
      },
      tolerations: [...existingTolerations, ...tolerationsMock],
    });
  });

  it('should assemble pod spec correctly when resourceSetting is empty object', () => {
    const resourceSettingMock = {};
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMock,
      acceleratorProfiles: [acceleratorProfileMock],
      initialAcceleratorProfile: acceleratorProfileMock,
      count: 1,
      additionalOptions: { useExisting: true },
      useExisting: false,
    };
    const result = assemblePodSpecOptions(resourceSettingMock, acceleratorProfileState);
    expect(result).toStrictEqual({
      affinity: {},
      resources: {},
      tolerations: tolerationsMock,
    });
  });
});

describe('getshmVolumeMount', () => {
  it('should correctly return shm volume mount', () => {
    const result = getshmVolumeMount();
    expect(result).toStrictEqual({
      mountPath: '/dev/shm',
      name: 'shm',
    });
  });
});

describe('getshmVolume', () => {
  it('should correctly return shm volume', () => {
    const result = getshmVolume('10');
    expect(result).toStrictEqual({
      emptyDir: {
        medium: 'Memory',
        sizeLimit: '10',
      },
      name: 'shm',
    });
  });

  it('should correctly return shm volume when size limit is not given', () => {
    const result = getshmVolume();
    expect(result).toStrictEqual({
      emptyDir: {
        medium: 'Memory',
      },
      name: 'shm',
    });
  });
});
