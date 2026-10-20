import type { DashboardResource } from '@perses-dev/core';

export const mockPersesDashboard = ({
  name = 'test-dashboard',
  displayName = 'Test Dashboard',
  project = 'test-project',
  projectScoped = false,
}: {
  name?: string;
  displayName?: string;
  project?: string;
  projectScoped?: boolean;
} = {}): DashboardResource => ({
  kind: 'Dashboard',
  metadata: { name, project },
  spec: {
    display: { name: displayName },
    duration: '1h',
    variables: projectScoped
      ? [
          {
            kind: 'ListVariable',
            spec: {
              name: 'namespace',
              allowMultiple: false,
              allowAllValue: false,
              plugin: { kind: 'StaticListVariable', spec: { values: [] } },
            },
          },
        ]
      : [],
    panels: {},
    layouts: [],
  },
});
