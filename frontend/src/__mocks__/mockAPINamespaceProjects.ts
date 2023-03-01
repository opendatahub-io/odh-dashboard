export const mockAPINamespaceProjects = {
  kind: 'ProjectList',
  apiVersion: 'project.openshift.io/v1',
  metadata: {},
  items: [
    {
      metadata: {
        name: 'project',
        uid: '4e672dd8-55cc-44b8-973c-d2a05ed41fae',
        resourceVersion: '4789290',
        creationTimestamp: '2023-02-14T21:43:59Z',
        labels: {
          'kubernetes.io/metadata.name': 'project',
          'modelmesh-enabled': 'true',
          'opendatahub.io/dashboard': 'true',
          'pod-security.kubernetes.io/audit': 'restricted',
          'pod-security.kubernetes.io/audit-version': 'v1.24',
          'pod-security.kubernetes.io/warn': 'restricted',
          'pod-security.kubernetes.io/warn-version': 'v1.24',
        },
        annotations: {
          'openshift.io/description': '',
          'openshift.io/display-name': 'project',
          'openshift.io/requester': 'user',
          'openshift.io/sa.scc.mcs': 's0:c26,c25',
          'openshift.io/sa.scc.supplemental-groups': '1000700000/10000',
          'openshift.io/sa.scc.uid-range': '1000700000/10000',
        },
        managedFields: [],
      },
      spec: {
        finalizers: ['kubernetes'],
      },
      status: {
        phase: 'Active',
      },
    },
  ],
};
