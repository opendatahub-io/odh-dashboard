import { NotebookSize } from '#~/types';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import {
  getMinMaxResourceSize,
  createAcceleratorHardwareProfiles,
} from '#~/pages/hardwareProfiles/migration/utils';

describe('getMinMaxResourceSize', () => {
  it('should calculate min and max resources correctly', () => {
    const containerSizes: NotebookSize[] = [
      {
        name: 'Small',
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '4Gi', cpu: '2' },
        },
      },
      {
        name: 'Large',
        resources: {
          requests: { memory: '8Gi', cpu: '4' },
          limits: { memory: '16Gi', cpu: '8' },
        },
      },
    ];

    const result = getMinMaxResourceSize(containerSizes);

    expect(result).toEqual({
      minMemory: '2Gi',
      maxMemory: '16Gi',
      minCpu: '1',
      maxCpu: '8',
    });
  });

  it('should handle undefined limits', () => {
    const containerSizes: NotebookSize[] = [
      {
        name: 'Small',
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: undefined,
        },
      },
    ];

    const result = getMinMaxResourceSize(containerSizes);

    expect(result).toEqual({
      minMemory: '2Gi',
      maxMemory: '2Gi',
      minCpu: '1',
      maxCpu: '1',
    });
  });
});

describe('transformContainerSizeToHardwareProfile', () => {
  it('should transform container size to hardware profile', () => {
    const containerSize: NotebookSize = {
      name: 'Test Size',
      resources: {
        requests: { memory: '2Gi', cpu: '1' },
        limits: { memory: '4Gi', cpu: '2' },
      },
    };

    const result = transformContainerSizeToHardwareProfile(
      containerSize,
      'test-profile',
      'test-namespace',
      undefined,
      [HardwareProfileFeatureVisibility.WORKBENCH],
    );

    expect(result).toMatchObject({
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
        annotations: {
          'opendatahub.io/display-name': 'Test Size',
          'opendatahub.io/disabled': 'false',
          'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
            HardwareProfileFeatureVisibility.WORKBENCH,
          ]),
        },
      },
      spec: {
        identifiers: expect.arrayContaining([
          expect.objectContaining({
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
          }),
          expect.objectContaining({
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '4Gi',
          }),
        ]),
      },
    });
  });
});
