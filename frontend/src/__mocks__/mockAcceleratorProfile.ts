import _ from 'lodash';
import { AcceleratorKind } from '~/k8sTypes';
import { RecursivePartial } from '~/typeHelpers';
import { TolerationEffect, TolerationOperator } from '~/types';

export const mockAcceleratorProfile = (
  data: RecursivePartial<AcceleratorKind> = {},
): AcceleratorKind =>
  _.merge(
    {
      apiVersion: 'dashboard.opendatahub.io/v1',
      kind: 'AcceleratorProfile',
      metadata: {
        name: 'test-accelerator',
        annotations: {
          'opendatahub.io/modified-date': '2023-10-31T21:16:11.721Z',
        },
      },
      spec: {
        displayName: 'Test Accelerator',
        enabled: true,
        identifier: 'nvidia.com/gpu',
        description: 'Test description',
        tolerations: [
          {
            key: 'nvidia.com/gpu',
            operator: TolerationOperator.EXISTS,
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    } as AcceleratorKind,
    data,
  );
