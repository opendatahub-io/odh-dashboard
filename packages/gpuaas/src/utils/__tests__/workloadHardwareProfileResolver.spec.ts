import {
  HardwareProfileFeatureVisibility,
  IdentifierResourceType,
  SchedulingType,
  type HardwareProfileKind,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import type { WorkloadInferenceService } from '../../types/inferenceService';
import { QuotaUsageWorkloadTypes } from '../../types';
import { resolveWorkloadHardwareProfileForRow } from '../workloadHardwareProfileResolver';

const servingProfile: HardwareProfileKind = {
  apiVersion: 'infrastructure.opendatahub.io/v1',
  kind: 'HardwareProfile',
  metadata: {
    name: 'brno-ai-serving-profile',
    namespace: 'redhat-ods-applications',
    annotations: {
      'opendatahub.io/display-name': 'brno-ai-serving-profile',
      'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
        HardwareProfileFeatureVisibility.MODEL_SERVING,
      ]),
      'opendatahub.io/disabled': 'false',
    },
  },
  spec: {
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: 1,
        maxCount: 4,
        defaultCount: 2,
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '8Gi',
        defaultCount: '4Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
      {
        displayName: 'GPU',
        identifier: 'nvidia.com/gpu',
        minCount: 1,
        maxCount: 8,
        defaultCount: 1,
        resourceType: IdentifierResourceType.ACCELERATOR,
      },
    ],
    // Old matcher (same as useHardwareProfileConfig) needs scheduling.node present;
    // missing tolerations field makes resource match fail.
    scheduling: { type: SchedulingType.NODE, node: { tolerations: [], nodeSelector: {} } },
  },
};

const trainWorkload = (): WorkloadKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'Workload',
    metadata: { name: 'trainjob-llama', namespace: 'dsp-1' },
    spec: {
      active: true,
      podSets: [
        {
          count: 1,
          name: 'main',
          template: {
            metadata: {},
            spec: {
              containers: [
                {
                  name: 'main',
                  image: 'train',
                  resources: {
                    requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': '1' },
                    limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': '1' },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  } as unknown as WorkloadKind);

describe('workloadHardwareProfileResolver', () => {
  it('returns configured profile from StatefulSet pod-template annotations (notebook path)', () => {
    const hardwareProfileByKey = new Map([
      [
        'redhat-ods-applications/default-profile',
        {
          ...servingProfile,
          metadata: {
            ...servingProfile.metadata,
            name: 'default-profile',
            annotations: {
              'opendatahub.io/display-name': 'default-profile',
              'opendatahub.io/disabled': 'false',
            },
          },
        },
      ],
    ]);

    const result = resolveWorkloadHardwareProfileForRow(trainWorkload(), {
      annotationSources: [
        {
          'opendatahub.io/hardware-profile-name': 'default-profile',
          'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
        },
      ],
      hardwareProfileByKey,
      hardwareProfilesForMatching: [],
      workloadType: QuotaUsageWorkloadTypes.Workbench,
    });

    expect(result).toEqual({
      displayName: 'default-profile',
      acceleratorIdentifier: 'nvidia.com/gpu',
    });
  });

  it('matches model deployment resources to a serving HardwareProfile when no annotation exists', () => {
    const inferenceService = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: { name: 'my-model', namespace: 'dsp-1' },
      spec: {
        predictor: {
          model: {
            resources: {
              requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': '1' },
              limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': '1' },
            },
          },
        },
      },
    } as WorkloadInferenceService;

    const result = resolveWorkloadHardwareProfileForRow(trainWorkload(), {
      annotationSources: [],
      inferenceService,
      hardwareProfileByKey: new Map(),
      hardwareProfilesForMatching: [servingProfile],
      workloadType: QuotaUsageWorkloadTypes.Serve,
    });

    expect(result).toEqual({
      displayName: 'brno-ai-serving-profile',
      acceleratorIdentifier: 'nvidia.com/gpu',
    });
  });

  it('returns undefined when resources do not match any hardware profile', () => {
    const unmatchedWorkload = (): WorkloadKind =>
      ({
        ...trainWorkload(),
        spec: {
          ...trainWorkload().spec,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {},
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'train',
                      resources: {
                        requests: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': '2' },
                        limits: { cpu: '16', memory: '64Gi', 'nvidia.com/gpu': '2' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      } as unknown as WorkloadKind);

    const inferenceService = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: { name: 'qwen38-27b', namespace: 'qwen' },
      spec: {
        predictor: {
          model: {
            resources: {
              requests: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': '2' },
              limits: { cpu: '16', memory: '64Gi', 'nvidia.com/gpu': '2' },
            },
          },
        },
      },
    } as WorkloadInferenceService;

    const result = resolveWorkloadHardwareProfileForRow(unmatchedWorkload(), {
      annotationSources: [],
      inferenceService,
      hardwareProfileByKey: new Map(),
      hardwareProfilesForMatching: [servingProfile],
      workloadType: QuotaUsageWorkloadTypes.Serve,
    });

    expect(result).toBeUndefined();
  });
});
