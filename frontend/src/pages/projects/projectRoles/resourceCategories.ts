export type ResourceInfo = {
  name: string;
  label: string;
  apiGroup: string;
};

export type ResourceCategory = {
  id: string;
  label: string;
  resources: ResourceInfo[];
};

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'core',
    label: 'Core',
    resources: [
      { name: 'pods', label: 'Pods', apiGroup: '' },
      { name: 'services', label: 'Services', apiGroup: '' },
      { name: 'configmaps', label: 'ConfigMaps', apiGroup: '' },
      { name: 'namespaces', label: 'Projects (namespaces)', apiGroup: '' },
      { name: 'events', label: 'Events', apiGroup: '' },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    resources: [
      { name: 'notebooks', label: 'Workbenches (notebooks)', apiGroup: 'kubeflow.org' },
      { name: 'imagestreams', label: 'Image streams', apiGroup: 'image.openshift.io' },
      {
        name: 'hardwareprofiles',
        label: 'Hardware profiles',
        apiGroup: 'infrastructure.opendatahub.io',
      },
      { name: 'deployments', label: 'Deployments', apiGroup: 'apps' },
      { name: 'statefulsets', label: 'StatefulSets', apiGroup: 'apps' },
      { name: 'daemonsets', label: 'DaemonSets', apiGroup: 'apps' },
      { name: 'jobs', label: 'Jobs', apiGroup: 'batch' },
      { name: 'cronjobs', label: 'CronJobs', apiGroup: 'batch' },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    resources: [
      { name: 'persistentvolumes', label: 'Persistent volumes', apiGroup: '' },
      {
        name: 'persistentvolumeclaims',
        label: 'Cluster storage (persistentvolumeclaims)',
        apiGroup: '',
      },
      { name: 'storageclasses', label: 'Storage classes', apiGroup: 'storage.k8s.io' },
    ],
  },
  {
    id: 'networking',
    label: 'Networking',
    resources: [
      { name: 'networkpolicies', label: 'Network policies', apiGroup: 'networking.k8s.io' },
      { name: 'ingresses', label: 'Ingresses', apiGroup: 'networking.k8s.io' },
    ],
  },
  {
    id: 'rbac',
    label: 'RBAC',
    resources: [
      { name: 'roles', label: 'Roles', apiGroup: 'rbac.authorization.k8s.io' },
      { name: 'rolebindings', label: 'Role bindings', apiGroup: 'rbac.authorization.k8s.io' },
      { name: 'clusterroles', label: 'Cluster roles', apiGroup: 'rbac.authorization.k8s.io' },
      {
        name: 'clusterrolebindings',
        label: 'Cluster role bindings',
        apiGroup: 'rbac.authorization.k8s.io',
      },
    ],
  },
];

export const ALL_RESOURCES_WILDCARD = '*';
