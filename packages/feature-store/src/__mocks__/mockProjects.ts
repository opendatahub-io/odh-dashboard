import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';

export const mockProjects: ProjectKind[] = [
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'user-project',
      uid: 'user-project-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'default',
      uid: 'default-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'openshift-monitoring',
      uid: 'openshift-monitoring-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'kube-system',
      uid: 'kube-system-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'system',
      uid: 'system-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: 'feature-store-project',
      uid: 'feature-store-project-uid',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Active' },
  },
];

export const createMockProject = (
  name: string,
  options: {
    uid?: string;
    creationTimestamp?: string;
    phase?: 'Active' | 'Terminating';
  } = {},
): ProjectKind => ({
  apiVersion: 'project.openshift.io/v1',
  kind: 'Project',
  metadata: {
    name,
    uid: options.uid || `${name}-uid`,
    creationTimestamp: options.creationTimestamp || '2024-01-01T00:00:00Z',
  },
  spec: {},
  status: { phase: options.phase || 'Active' },
});
