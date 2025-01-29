import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import {
  assemblePodSpecOptions,
  getshmVolume,
  getshmVolumeMount,
  parseCommandLine,
} from '~/api/k8s/utils';
import { ContainerResources, TolerationEffect, TolerationOperator } from '~/types';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assemblePodSpecOptions', () => {
  const resourceSettings: ContainerResources = {
    limits: { cpu: '1', memory: '1Gi' },
    requests: { cpu: '0.5', memory: '500Mi' },
  };
  const tolerationsMock = [
    {
      effect: TolerationEffect.NO_SCHEDULE,
      key: 'nvidia.com/gpu',
      operator: TolerationOperator.EXISTS,
    },
  ];

  it('should assemble pod spec options correctly when a accelerator profile is selected', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: undefined,
      acceleratorProfiles: [acceleratorProfileMock],
      count: 0,
      unknownProfileDetected: false,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: acceleratorProfileMock,
      count: 1,
      useExistingSettings: false,
    };
    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );
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

  it('should assemble pod spec options correctly when there is an initial accelerator profile and it is unselected', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMock,
      acceleratorProfiles: [acceleratorProfileMock],
      count: 1,
      unknownProfileDetected: false,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: undefined,
      count: 0,
      useExistingSettings: false,
    };
    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      selectedAcceleratorProfile,
      undefined,
      tolerationsMock,
      undefined,
      {
        limits: {
          [acceleratorProfileMock.spec.identifier]: acceleratorProfileState.count,
          cpu: '1',
          memory: '1Gi',
        },
        requests: {
          [acceleratorProfileMock.spec.identifier]: acceleratorProfileState.count,
          cpu: '0.5',
          memory: '500Mi',
        },
      },
    );
    expect(result).toStrictEqual({
      affinity: {},
      tolerations: [],
      resources: {
        limits: {
          cpu: '1',
          memory: '1Gi',
        },
        requests: {
          cpu: '0.5',
          memory: '500Mi',
        },
      },
    });
  });

  it('should assemble pod spec options correctly when there is an initial accelerator profile and another is selected', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const acceleratorProfileMockInitial = mockAcceleratorProfile({
      identifier: 'amd.com/gpu',
    });

    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: acceleratorProfileMockInitial,
      acceleratorProfiles: [acceleratorProfileMock, acceleratorProfileMockInitial],
      count: 1,
      unknownProfileDetected: false,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: acceleratorProfileMock,
      count: 1,
      useExistingSettings: false,
    };
    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      selectedAcceleratorProfile,
      undefined,
      tolerationsMock,
      undefined,
      {
        limits: {
          [acceleratorProfileMockInitial.spec.identifier]: acceleratorProfileState.count,
          cpu: '1',
          memory: '1Gi',
        },
        requests: {
          [acceleratorProfileMockInitial.spec.identifier]: acceleratorProfileState.count,
          cpu: '0.5',
          memory: '500Mi',
        },
      },
    );
    expect(result).toStrictEqual({
      affinity: {},
      tolerations: tolerationsMock,
      resources: {
        limits: {
          [acceleratorProfileMock.spec.identifier]: selectedAcceleratorProfile.count,
          cpu: '1',
          memory: '1Gi',
        },
        requests: {
          [acceleratorProfileMock.spec.identifier]: selectedAcceleratorProfile.count,
          cpu: '0.5',
          memory: '500Mi',
        },
      },
    });
  });

  it('should assemble pod spec correctly with an unknown accelerator detected and another accelerator selected and affinitySettings given ', () => {
    const acceleratorProfileMock = mockAcceleratorProfile({});
    const affinitySettings = { nodeAffinity: { key: 'value' } };
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: undefined,
      acceleratorProfiles: [acceleratorProfileMock],
      count: 1,
      unknownProfileDetected: true,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: acceleratorProfileMock,
      count: 1,
      useExistingSettings: false,
    };

    const existingResources = {
      limits: { cpu: '0', memory: '0Gi', 'amd.com/gpu': 1 },
      requests: { cpu: '0.5', memory: '500Mi', 'amd.com/gpu': 1 },
    };

    const existingTolerations = [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'amd.com/gpu',
        operator: TolerationOperator.EXISTS,
      },
    ];

    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      selectedAcceleratorProfile,
      undefined,
      existingTolerations,
      affinitySettings,
      existingResources,
    );

    expect(result).toStrictEqual({
      affinity: {
        nodeAffinity: {
          key: 'value',
        },
      },
      tolerations: [
        {
          effect: TolerationEffect.NO_SCHEDULE,
          key: 'amd.com/gpu',
          operator: TolerationOperator.EXISTS,
        },
        {
          effect: TolerationEffect.NO_SCHEDULE,
          key: 'nvidia.com/gpu',
          operator: TolerationOperator.EXISTS,
        },
      ],
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
      count: 1,
      unknownProfileDetected: false,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: acceleratorProfileMock,
      count: 1,
      useExistingSettings: false,
    };

    const result = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfileState,
      selectedAcceleratorProfile,
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
      count: 1,
      unknownProfileDetected: false,
    };
    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: acceleratorProfileMock,
      count: 1,
      useExistingSettings: false,
    };
    const result = assemblePodSpecOptions(
      resourceSettingMock,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );
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

describe('parseCommandLine', () => {
  test('parses simple space-separated arguments', () => {
    expect(parseCommandLine('arg1 arg2 arg3')).toEqual(['arg1', 'arg2', 'arg3']);
  });

  test('handles double-quoted arguments', () => {
    expect(parseCommandLine('"arg1 with spaces" arg2')).toEqual(['arg1 with spaces', 'arg2']);
  });

  test('handles single-quoted arguments', () => {
    expect(parseCommandLine("'arg1 with spaces' arg2")).toEqual(['arg1 with spaces', 'arg2']);
  });

  test('handles mixed quotes', () => {
    expect(parseCommandLine('\'single quoted\' "double quoted"')).toEqual([
      'single quoted',
      'double quoted',
    ]);
  });

  test('handles nested quotes', () => {
    expect(parseCommandLine("'nested\"'")).toEqual(['nested"']);
  });

  test('handles empty input', () => {
    expect(parseCommandLine('')).toEqual([]);
  });

  test('handles arguments with special characters', () => {
    expect(parseCommandLine('arg1 arg2!@#$%^&*()')).toEqual(['arg1', 'arg2!@#$%^&*()']);
  });

  test('handles arguments with escaped spaces', () => {
    expect(parseCommandLine('arg1 "arg with spaces" arg3')).toEqual([
      'arg1',
      'arg with spaces',
      'arg3',
    ]);
  });

  test('removes surrounding quotes from single-quoted arguments', () => {
    expect(parseCommandLine("'arg with spaces'")).toEqual(['arg with spaces']);
  });

  test('removes surrounding quotes from double-quoted arguments', () => {
    expect(parseCommandLine('"arg with spaces"')).toEqual(['arg with spaces']);
  });

  test('handles multiple consecutive spaces', () => {
    expect(parseCommandLine('arg1   arg2    arg3')).toEqual(['arg1', 'arg2', 'arg3']);
  });

  test('handles multi-line input', () => {
    expect(parseCommandLine('arg1 arg2\narg3 arg4')).toEqual(['arg1', 'arg2', 'arg3', 'arg4']);
  });
});
