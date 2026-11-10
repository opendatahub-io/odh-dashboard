import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';
import { interpolateQueryParams } from '@perses-dev/components';
import type { VariableStateMap } from '@perses-dev/components';
import { transformNamespaceVariable } from '../transformDashboardVariables';

const DS_NAMESPACE_QUERY_PARAMS = {
  namespace: '${namespace:queryparam}',
} as const;

const createModelsStyleDashboard = (): DashboardResource =>
  ({
    kind: 'Dashboard',
    metadata: { name: 'dashboard-1-model', project: 'opendatahub' },
    spec: {
      display: { name: 'Models' },
      variables: [
        {
          kind: 'TextVariable',
          spec: { name: 'namespace', value: '' },
        },
      ],
    },
  } as DashboardResource);

describe('scoped namespace queryparam wire', () => {
  const projects = ['project-a', 'project-b', 'project-c'];

  it('should transform Project=All to concrete namespace options without a wildcard', () => {
    const result = transformNamespaceVariable(createModelsStyleDashboard(), projects);
    const namespaceVar = result.spec.variables.find(
      (variable) => variable.kind === 'ListVariable' && variable.spec.name === 'namespace',
    ) as ListVariableDefinition | undefined;

    expect(namespaceVar?.spec.allowAllValue).toBe(true);
    expect(namespaceVar?.spec.customAllValue).toBeUndefined();
    expect(namespaceVar?.spec.plugin.spec).toEqual({
      values: projects.map((name) => ({ label: name, value: name })),
    });
  });

  it('should emit repeated concrete namespace values for expanded All', () => {
    const variableState: VariableStateMap = {
      namespace: {
        value: projects,
        options: projects.map((value) => ({ label: value, value })),
        loading: false,
      },
    };

    const wire = interpolateQueryParams({ ...DS_NAMESPACE_QUERY_PARAMS }, variableState);

    expect(wire.namespace).toEqual(projects);
    expect(wire.namespace).not.toEqual('.*');
  });

  it('should emit only selected namespaces for a multi-select subset', () => {
    const selected = ['project-a', 'project-c'];
    const variableState: VariableStateMap = {
      namespace: {
        value: selected,
        options: projects.map((value) => ({ label: value, value })),
        loading: false,
      },
    };

    const wire = interpolateQueryParams({ ...DS_NAMESPACE_QUERY_PARAMS }, variableState);

    expect(wire.namespace).toEqual(selected);
  });
});
