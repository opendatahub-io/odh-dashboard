import type { ResourceRule } from '#~/k8sTypes';

export type RoleTemplate = {
  id: string;
  name: string;
  description: string;
  rules: ResourceRule[];
};

export type RoleTemplateCategory = {
  id: string;
  name: string;
  templates: RoleTemplate[];
};

export const ROLE_TEMPLATE_CATALOG: RoleTemplateCategory[] = [
  {
    id: 'workbench-management',
    name: 'Workbench management templates',
    templates: [
      {
        id: 'workbench-maintainer',
        name: 'Workbench maintainer',
        description:
          'A set of rules that grants users to act as the admin of the workbench component.',
        rules: [
          {
            apiGroups: ['kubeflow.org'],
            resources: ['notebooks'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: [''],
            resources: ['persistentvolumeclaims', 'secrets', 'configmaps'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: [''],
            resources: ['namespaces', 'persistentvolumeclaims/status', 'pods', 'events'],
            verbs: ['get', 'watch', 'list'],
          },
          { apiGroups: ['apps'], resources: ['statefulsets'], verbs: ['get', 'watch', 'list'] },
          {
            apiGroups: ['image.openshift.io'],
            resources: ['imagestreams'],
            verbs: ['get', 'watch', 'list'],
          },
          {
            apiGroups: ['infrastructure.opendatahub.io'],
            resources: ['hardwareprofiles'],
            verbs: ['get', 'watch', 'list'],
          },
        ],
      },
      {
        id: 'workbench-reader',
        name: 'Workbench reader',
        description:
          'A set of rules that grants users to view the workbench component without modification permissions.',
        rules: [
          {
            apiGroups: ['kubeflow.org'],
            resources: ['notebooks'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: [
              'namespaces',
              'persistentvolumeclaims',
              'persistentvolumeclaims/status',
              'pods',
              'secrets',
              'configmaps',
              'events',
            ],
            verbs: ['get', 'list', 'watch'],
          },
          { apiGroups: ['apps'], resources: ['statefulsets'], verbs: ['get', 'list', 'watch'] },
          {
            apiGroups: ['image.openshift.io'],
            resources: ['imagestreams'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: ['infrastructure.opendatahub.io'],
            resources: ['hardwareprofiles'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      },
      {
        id: 'workbench-updater',
        name: 'Workbench updater',
        description:
          'A set of rules that grants users to act as the updater of the workbench component without creation/deletion permissions.',
        rules: [
          {
            apiGroups: ['kubeflow.org'],
            resources: ['notebooks'],
            verbs: ['get', 'watch', 'list', 'update', 'patch'],
          },
          {
            apiGroups: [''],
            resources: ['persistentvolumeclaims', 'secrets', 'configmaps'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: [''],
            resources: ['namespaces', 'persistentvolumeclaims/status', 'pods', 'events'],
            verbs: ['get', 'watch', 'list'],
          },
          { apiGroups: ['apps'], resources: ['statefulsets'], verbs: ['get', 'watch', 'list'] },
          {
            apiGroups: ['image.openshift.io'],
            resources: ['imagestreams'],
            verbs: ['get', 'watch', 'list'],
          },
          {
            apiGroups: ['infrastructure.opendatahub.io'],
            resources: ['hardwareprofiles'],
            verbs: ['get', 'watch', 'list'],
          },
        ],
      },
    ],
  },
];
