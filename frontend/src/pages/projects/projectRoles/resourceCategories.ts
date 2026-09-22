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
      { name: 'secrets', label: 'Secrets', apiGroup: '' },
      { name: 'serviceaccounts', label: 'Service accounts', apiGroup: '' },
      { name: 'nodes', label: 'Nodes', apiGroup: '' },
      { name: 'namespaces', label: 'Projects (namespaces)', apiGroup: '' },
      { name: 'events', label: 'Events', apiGroup: '' },
      { name: 'persistentvolumes', label: 'Persistent volumes', apiGroup: '' },
      {
        name: 'persistentvolumeclaims',
        label: 'Cluster storage (persistentvolumeclaims)',
        apiGroup: '',
      },
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
      { name: 'storageclasses', label: 'Storage classes', apiGroup: 'storage.k8s.io' },
      { name: 'volumeattachments', label: 'Volume attachments', apiGroup: 'storage.k8s.io' },
      {
        name: 'volumesnapshots',
        label: 'Volume snapshots',
        apiGroup: 'snapshot.storage.k8s.io',
      },
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
      {
        name: 'subjectaccessreviews',
        label: 'Subject access reviews',
        apiGroup: 'authorization.k8s.io',
      },
      {
        name: 'localsubjectaccessreviews',
        label: 'Local subject access reviews',
        apiGroup: 'authorization.k8s.io',
      },
      {
        name: 'selfsubjectaccessreviews',
        label: 'Self subject access reviews',
        apiGroup: 'authorization.k8s.io',
      },
      {
        name: 'selfsubjectrulesreviews',
        label: 'Self subject rules reviews',
        apiGroup: 'authorization.k8s.io',
      },
      { name: 'tokenreviews', label: 'Token reviews', apiGroup: 'authentication.k8s.io' },
    ],
  },
];

export const ALL_RESOURCES_WILDCARD = '*';

type ResourceApiGroupRef = {
  name: string;
  apiGroup: string;
};

/**
 * Resource name → API group. Discovery is the source of truth (first occurrence wins).
 * Static categories fill names that discovery did not return (empty/failed discovery, or not on cluster).
 */
export const buildResourceToApiGroupMap = (
  discoveredResources: ResourceApiGroupRef[],
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const r of discoveredResources) {
    if (!map.has(r.name)) {
      map.set(r.name, r.apiGroup);
    }
  }
  for (const category of RESOURCE_CATEGORIES) {
    for (const r of category.resources) {
      if (!map.has(r.name)) {
        map.set(r.name, r.apiGroup);
      }
    }
  }
  return map;
};
