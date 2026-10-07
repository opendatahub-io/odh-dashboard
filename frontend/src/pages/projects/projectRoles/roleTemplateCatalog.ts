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

/** Templates are copied into a Role at creation; Roles created from an older template are not updated automatically. */
export const ROLE_TEMPLATE_MIGRATION_NOTE =
  'Template rules are copied into the role when it is created; roles created from an earlier version of a template are not updated automatically.';

// Read-only access to the DRA claims a workbench Pod references; no DeviceClass, ResourceSlice, Node, list, or watch.
const DRA_READ_RULE: ResourceRule = {
  apiGroups: ['resource.k8s.io'],
  resources: ['resourceclaims', 'resourceclaimtemplates'],
  verbs: ['get'],
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
          DRA_READ_RULE,
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
          DRA_READ_RULE,
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
          DRA_READ_RULE,
        ],
      },
    ],
  },
];
