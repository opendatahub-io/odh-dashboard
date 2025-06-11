import { BuildPhase } from '#~/k8sTypes';
import { SpawnerPageSectionID, SpawnerPageSectionTitlesType } from './types';

export const SpawnerPageSectionTitles: SpawnerPageSectionTitlesType = {
  [SpawnerPageSectionID.NAME_DESCRIPTION]: 'Name and description',
  [SpawnerPageSectionID.WORKBENCH_IMAGE]: 'Workbench image',
  [SpawnerPageSectionID.DEPLOYMENT_SIZE]: 'Deployment size',
  [SpawnerPageSectionID.ENVIRONMENT_VARIABLES]: 'Environment variables',
  [SpawnerPageSectionID.CLUSTER_STORAGE]: 'Cluster storage',
  [SpawnerPageSectionID.CONNECTIONS]: 'Connections',
};

export const ScrollableSelectorID = 'workbench-spawner-page';

export const FAILED_PHASES = [BuildPhase.ERROR, BuildPhase.FAILED];
export const PENDING_PHASES = [BuildPhase.NEW, BuildPhase.PENDING, BuildPhase.CANCELLED];
export const K8_NOTEBOOK_RESOURCE_NAME_VALIDATOR = /^[a-z]([-a-z0-9]*[a-z0-9])?$/;

// TODO: Convert to enum
export const IMAGE_ANNOTATIONS = {
  DESC: 'opendatahub.io/notebook-image-desc' as const,
  DISP_NAME: 'opendatahub.io/notebook-image-name' as const,
  URL: 'opendatahub.io/notebook-image-url' as const,
  DEFAULT: 'opendatahub.io/default-image' as const,
  SOFTWARE: 'opendatahub.io/notebook-software' as const,
  DEPENDENCIES: 'opendatahub.io/notebook-python-dependencies' as const,
  IMAGE_ORDER: 'opendatahub.io/notebook-image-order' as const,
  RECOMMENDED: 'opendatahub.io/workbench-image-recommended' as const,
  OUTDATED: 'opendatahub.io/image-tag-outdated' as const,
};

export const DEFAULT_NOTEBOOK_SIZES = [
  {
    name: 'Small',
    resources: {
      requests: {
        cpu: '1',
        memory: '8Gi',
      },
      limits: {
        cpu: '2',
        memory: '8Gi',
      },
    },
  },
  {
    name: 'Medium',
    resources: {
      requests: {
        cpu: '3',
        memory: '24Gi',
      },
      limits: {
        cpu: '6',
        memory: '24Gi',
      },
    },
  },
  {
    name: 'Large',
    resources: {
      requests: {
        cpu: '7',
        memory: '56Gi',
      },
      limits: {
        cpu: '14',
        memory: '56Gi',
      },
    },
  },
  {
    name: 'X Large',
    resources: {
      requests: {
        cpu: '15',
        memory: '120Gi',
      },
      limits: {
        cpu: '30',
        memory: '120Gi',
      },
    },
  },
];
