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
            resources: ['pods', 'pods/log', 'events'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: ['persistentvolumeclaims'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: [''],
            resources: ['secrets', 'configmaps'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: ['rbac.authorization.k8s.io'],
            resources: ['roles', 'rolebindings'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
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
            resources: ['pods', 'pods/log', 'events'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: ['persistentvolumeclaims'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: ['secrets', 'configmaps'],
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
            verbs: ['get', 'list', 'watch', 'update', 'patch'],
          },
          {
            apiGroups: [''],
            resources: ['pods', 'pods/log', 'events'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: ['persistentvolumeclaims'],
            verbs: ['get', 'list', 'watch', 'update', 'patch'],
          },
          {
            apiGroups: [''],
            resources: ['secrets', 'configmaps'],
            verbs: ['get', 'list', 'watch', 'update', 'patch'],
          },
        ],
      },
    ],
  },
];
