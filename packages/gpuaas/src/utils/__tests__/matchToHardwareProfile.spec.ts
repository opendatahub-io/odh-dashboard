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
});
