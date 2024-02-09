import { K8sResourceListResult } from '@openshift/dynamic-plugin-sdk-utils';
import { genUID } from '~/__mocks__/mockUtils';
import { KnownLabels, ProjectKind } from '~/k8sTypes';

type MockResourceConfigType = {
  username?: string;
  displayName?: string;
  description?: string;
  k8sName?: string;
  enableModelMesh?: boolean;
  isDSProject?: boolean;
  phase?: 'Active' | 'Terminating';
};

export const mockProjectK8sResource = ({
  username = 'test-user',
  displayName = 'Test Project',
  k8sName = 'test-project',
  enableModelMesh,
  description = '',
  isDSProject = true,
  phase = 'Active',
}: MockResourceConfigType): ProjectKind => ({
  kind: 'Project',
  apiVersion: 'project.openshift.io/v1',
  metadata: {
    name: k8sName,
    uid: genUID('project'),
    creationTimestamp: '2023-02-14T21:43:59Z',
    labels: {
      'kubernetes.io/metadata.name': k8sName,
      ...(enableModelMesh !== undefined && {
        [KnownLabels.MODEL_SERVING_PROJECT]: enableModelMesh ? 'true' : 'false',
      }),
      ...(isDSProject && { [KnownLabels.DASHBOARD_RESOURCE]: 'true' }),
    },
    annotations: {
      'openshift.io/description': description,
      'openshift.io/display-name': displayName,
      'openshift.io/requester': username,
    },
  },
  status: {
    phase,
  },
});

export const mockProjectsK8sList = (): K8sResourceListResult<ProjectKind> => ({
  apiVersion: 'project.openshift.io/v1',
  metadata: { continue: '', resourceVersion: '1462210' },
  items: [
    mockProjectK8sResource({
      k8sName: 'ds-project-1',
      displayName: 'DS Project 1',
      isDSProject: true,
    }),
    mockProjectK8sResource({
      k8sName: 'ds-project-2',
      displayName: 'DS Project 2',
      isDSProject: true,
    }),
    mockProjectK8sResource({
      k8sName: 'ds-project-3',
      displayName: 'DS Project 3',
      isDSProject: true,
    }),
    mockProjectK8sResource({
      k8sName: 'non-ds-project-1',
      displayName: 'Non-DS Project 1',
      isDSProject: false,
    }),
    mockProjectK8sResource({
      k8sName: 'non-ds-project-2',
      displayName: 'Non-DS Project 2',
      isDSProject: false,
    }),
    mockProjectK8sResource({
      k8sName: 'non-ds-project-3',
      displayName: 'Non-DS Project 3',
      isDSProject: false,
    }),
  ],
});
