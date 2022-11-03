import { ServingRuntimeSize } from './types';

export const DEFAULT_MODEL_SERVER_SIZES: ServingRuntimeSize[] = [
  {
    name: 'Small',
    resources: {
      limits: {
        cpu: '1',
        memory: '4Gi',
      },
      requests: {
        cpu: '2',
        memory: '8Gi',
      },
    },
  },
  {
    name: 'Medium',
    resources: {
      limits: {
        cpu: '4',
        memory: '8Gi',
      },
      requests: {
        cpu: '8',
        memory: '10Gi',
      },
    },
  },
  {
    name: 'Large',
    resources: {
      limits: {
        cpu: '6',
        memory: '16Gi',
      },
      requests: {
        cpu: '10',
        memory: '20Gi',
      },
    },
  },
];
