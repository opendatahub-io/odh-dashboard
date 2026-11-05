import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';
import { interpolateQueryParams } from '@perses-dev/components';
import type { VariableStateMap } from '@perses-dev/components';
import { transformNamespaceVariable } from '../transformDashboardVariables';

/**
 * Wire contract: DS / tenancy PersesDatasources pin
 * `queryParams.namespace: ${namespace:queryparam}`. After transform drops
 * namespace customAllValue, Project=All expands to a concrete string[] and
 * Perses must emit repeated namespace= values — never a PromQL wildcard.
 *
 * Exercises Perses interpolateQueryParams (same path the datasource client uses).
 */
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

describe('scoped namespace queryparam wire (All → multi namespace=)', () => {
  const projects = ['project-a', 'project-b', 'project-c'];

  it('transforms Models stub so All has no customAllValue (concrete expansion required)', () => {
    const result = transformNamespaceVariable(createModelsStyleDashboard(), projects);
    const namespaceVar = result.spec.variables.find(
      (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
    ) as ListVariableDefinition | undefined;

    expect(namespaceVar?.spec.allowAllValue).toBe(true);
    expect(namespaceVar?.spec.customAllValue).toBeUndefined();
    expect(namespaceVar?.spec.plugin.spec).toEqual({
      values: projects.map((name) => ({ label: name, value: name })),
    });
  });

  it('Project=All (expanded concrete list) → repeated namespace values, never .*', () => {
    // Perses expands All to the StaticList when customAllValue is omitted.
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
    expect(Array.isArray(wire.namespace) ? wire.namespace.join('|') : wire.namespace).not.toMatch(
      /\.\*/,
    );
  });

  it('raw $__all without customAllValue does not expand to the option list (Perses 0.54)', () => {
    // interpolateQueryParams only expands to repeated keys when value is string[]
    // or customAllValue is set. A bare "$__all" scalar takes the QUERYPARAM
    // replaceVariables path → "namespace=%24__all", not the project list.
    // Product All must arrive here as the concrete string[] (previous test).
    const variableState: VariableStateMap = {
      namespace: {
        value: '$__all',
        options: projects.map((value) => ({ label: value, value })),
        loading: false,
      },
    };

    const wire = interpolateQueryParams({ ...DS_NAMESPACE_QUERY_PARAMS }, variableState);

    expect(wire.namespace).not.toEqual(projects);
    expect(Array.isArray(wire.namespace)).toBe(false);
    expect(String(wire.namespace)).not.toMatch(/\.\*/);
    // Perses 0.54 QUERYPARAM encoding of the unexpanded All sentinel.
    expect(String(wire.namespace)).toBe('namespace=%24__all');
  });

  it('multi-select subset → only selected namespaces on the wire', () => {
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

  it('literal wildcard value without list expansion contaminates the wire with .*', () => {
    // Documents why transform must strip customAllValue and why All must expand
    // to a concrete string[] before ${namespace:queryparam} runs. A bare ".*"
    // value does not become repeated namespace=project-* params.
    const variableState: VariableStateMap = {
      namespace: {
        value: '.*',
        options: projects.map((value) => ({ label: value, value })),
        loading: false,
      },
    };

    const wire = interpolateQueryParams({ ...DS_NAMESPACE_QUERY_PARAMS }, variableState);

    expect(Array.isArray(wire.namespace)).toBe(false);
    expect(String(wire.namespace)).toContain('.*');
    expect(wire.namespace).not.toEqual(projects);
  });
});
