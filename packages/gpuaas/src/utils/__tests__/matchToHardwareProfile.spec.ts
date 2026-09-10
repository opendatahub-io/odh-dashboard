import {
  SchedulingType,
  TolerationEffect,
  TolerationOperator,
  type HardwareProfileKind,
} from '@odh-dashboard/k8s-core';
import { matchToHardwareProfile } from '../matchToHardwareProfile';

const gpuProfile = (tolerations: HardwareProfileKind['spec']['scheduling']): HardwareProfileKind =>
  ({
    apiVersion: 'dashboard.opendatahub.io/v1',
    kind: 'HardwareProfile',
    metadata: { name: 'gpu-profile' },
    spec: {
      identifiers: [
        {
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 1,
          defaultCount: 1,
        },
      ],
      scheduling: tolerations,
    },
  } as HardwareProfileKind);

const gpuResources = {
  requests: { 'nvidia.com/gpu': '1', cpu: '1', memory: '4Gi' },
  limits: { 'nvidia.com/gpu': '1', cpu: '1', memory: '4Gi' },
};

describe('matchToHardwareProfile', () => {
  it('matches a profile without scheduling configuration', () => {
    const profile = gpuProfile(undefined);

    expect(matchToHardwareProfile([profile], gpuResources)).toBe(profile);
  });

  it('matches when workload omits toleration operator and profile uses Equal', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [
          {
            key: 'gpu-node',
            operator: TolerationOperator.EQUAL,
            value: 'true',
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        { key: 'gpu-node', value: 'true', effect: TolerationEffect.NO_SCHEDULE },
      ]),
    ).toBe(profile);
  });

  it('matches when workload toleration omits effect', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [
          {
            key: 'gpu-node',
            operator: TolerationOperator.EQUAL,
            value: 'true',
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        { key: 'gpu-node', operator: TolerationOperator.EQUAL, value: 'true' },
      ]),
    ).toBe(profile);
  });

  it('matches when profile toleration omits effect', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [{ key: 'gpu-node', value: 'true' }],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        {
          key: 'gpu-node',
          operator: TolerationOperator.EQUAL,
          value: 'true',
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ]),
    ).toBe(profile);
  });

  it('ignores toleration seconds when matching scheduling tolerations', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [
          {
            key: 'gpu-node',
            operator: TolerationOperator.EQUAL,
            value: 'true',
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        {
          key: 'gpu-node',
          operator: TolerationOperator.EQUAL,
          value: 'true',
          effect: TolerationEffect.NO_SCHEDULE,
          tolerationSeconds: 60,
        },
      ]),
    ).toBe(profile);
  });

  it('does not match when explicit workload effect differs from profile effect', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [
          {
            key: 'gpu-node',
            operator: TolerationOperator.EQUAL,
            value: 'true',
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        {
          key: 'gpu-node',
          operator: TolerationOperator.EQUAL,
          value: 'true',
          effect: TolerationEffect.NO_EXECUTE,
        },
      ]),
    ).toBeUndefined();
  });

  it('matches an empty-key Exists toleration', () => {
    const profile = gpuProfile({
      type: SchedulingType.NODE,
      node: {
        tolerations: [
          {
            key: '',
            operator: TolerationOperator.EXISTS,
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    });

    expect(
      matchToHardwareProfile([profile], gpuResources, [
        {
          key: '',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ]),
    ).toBe(profile);
  });
});
