export type ApiGroupInfo = {
  name: string;
  label: string;
  description: string;
};

export type ApiGroupCategory = {
  id: string;
  label: string;
  groups: ApiGroupInfo[];
};

export const API_GROUP_CATEGORIES: ApiGroupCategory[] = [
  {
    id: 'core',
    label: 'Core',
    groups: [
      {
        name: '',
        label: 'core',
        description: 'Pods, services, configmaps, PVCs, namespaces, events',
      },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    groups: [
      { name: 'apps', label: 'apps', description: 'Deployments, StatefulSets, DaemonSets' },
      { name: 'batch', label: 'batch', description: 'Jobs, CronJobs' },
      { name: 'kubeflow.org', label: 'kubeflow.org', description: 'Workbenches (notebooks)' },
      {
        name: 'image.openshift.io',
        label: 'image.openshift.io',
        description: 'Image streams',
      },
      {
        name: 'infrastructure.opendatahub.io',
        label: 'infrastructure.opendatahub.io',
        description: 'Hardware profiles',
      },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    groups: [
      {
        name: 'storage.k8s.io',
        label: 'storage.k8s.io',
        description: 'Storage classes, volume attachments',
      },
      {
        name: 'snapshot.storage.k8s.io',
        label: 'snapshot.storage.k8s.io',
        description: 'Volume snapshots',
      },
    ],
  },
  {
    id: 'networking',
    label: 'Networking',
    groups: [
      {
        name: 'networking.k8s.io',
        label: 'networking.k8s.io',
        description: 'Network policies, ingresses',
      },
      {
        name: 'k8s.cni.cncf.io',
        label: 'k8s.cni.cncf.io',
        description: 'Network attachment definitions',
      },
    ],
  },
  {
    id: 'rbac',
    label: 'RBAC',
    groups: [
      {
        name: 'rbac.authorization.k8s.io',
        label: 'rbac.authorization.k8s.io',
        description: 'Roles, role bindings, cluster roles',
      },
      {
        name: 'authorization.k8s.io',
        label: 'authorization.k8s.io',
        description: 'Subject access reviews',
      },
      {
        name: 'authentication.k8s.io',
        label: 'authentication.k8s.io',
        description: 'Token reviews',
      },
    ],
  },
];

export const ALL_API_GROUPS_WILDCARD = '*';
