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

/**
 * Mirrors Perses ListVariable All expansion when customAllValue is omitted:
 * `$__all` becomes the concrete option value list before queryparam interpolation.
 * Not a full VariableProvider — documents the handoff product code relies on.
 */
const expandPersesAllSelection = (
  value: string | string[],
  optionValues: string[],
  allowAllValue: boolean,
): string | string[] => {
  if (allowAllValue && value === '$__all') {
    return [...optionValues];
  }
  return value;
};

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

  it('Models transform default $__all → expanded wire after Perses-style All expansion', () => {
    // Production path: transform Models TextVariable stub → ListVariable with
    // allowAllValue and no customAllValue (defaultValue $__all). Perses then
    // expands All to the StaticList values before ${namespace:queryparam}.
    // interpolateQueryParams alone does not perform that expansion (see raw
    // $__all test); this covers the transform → expand → wire handoff.
    const transformed = transformNamespaceVariable(createModelsStyleDashboard(), projects);
    const namespaceVar = transformed.spec.variables.find(
      (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
    ) as ListVariableDefinition | undefined;
    expect(namespaceVar?.spec.defaultValue).toBe('$__all');
    expect(namespaceVar?.spec.customAllValue).toBeUndefined();
    expect(namespaceVar?.spec.allowAllValue).toBe(true);

    const optionValues =
      namespaceVar?.spec.plugin.spec &&
      typeof namespaceVar.spec.plugin.spec === 'object' &&
      'values' in namespaceVar.spec.plugin.spec
        ? (namespaceVar.spec.plugin.spec.values as { value: string }[]).map((v) => v.value)
        : [];
    expect(optionValues).toEqual(projects);

    const expandedAll = expandPersesAllSelection('$__all', optionValues, true);
    const wire = interpolateQueryParams(
      { ...DS_NAMESPACE_QUERY_PARAMS },
      {
        namespace: {
          value: expandedAll,
          options: optionValues.map((value) => ({ label: value, value })),
          loading: false,
        },
      },
    );
    expect(wire.namespace).toEqual(projects);

    const single = expandPersesAllSelection('project-b', optionValues, true);
    expect(
      String(
        interpolateQueryParams(
          { ...DS_NAMESPACE_QUERY_PARAMS },
          {
            namespace: {
              value: single,
              options: optionValues.map((value) => ({ label: value, value })),
              loading: false,
            },
          },
        ).namespace,
      ),
    ).toBe('namespace=project-b');

    const subset = ['project-a', 'project-c'];
    expect(
      interpolateQueryParams(
        { ...DS_NAMESPACE_QUERY_PARAMS },
        {
          namespace: {
            value: subset,
            options: optionValues.map((value) => ({ label: value, value })),
            loading: false,
          },
        },
      ).namespace,
    ).toEqual(subset);
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
