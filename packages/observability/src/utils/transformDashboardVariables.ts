import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';

export type NamespaceOption = {
  name: string;
  label: string;
};

/**
 * Replaces the namespace variable with a StaticListVariable from the given projects
 * so Perses does not race a Prometheus label-values query against Dashboard's project list.
 *
 * For scoped PersesDatasources (`queryParams.namespace: ${namespace:queryparam}`),
 * Project=All must not use a PromQL wildcard customAllValue (".*" / "(a|b)").
 * Omitting customAllValue lets Perses expand All to the concrete list →
 * namespace=a&namespace=b (SAR-checked per namespace).
 */
export function transformNamespaceVariable(
  dashboard: DashboardResource,
  projects: NamespaceOption[] | string[],
  initialNamespaceValue?: string | string[],
): DashboardResource {
  if (projects.length === 0) {
    return dashboard;
  }

  const namespaceOptions = projects.map((project) =>
    typeof project === 'string' ? { name: project, label: project } : project,
  );

  const { variables } = dashboard.spec;
  // variables may be undefined at runtime for dashboards that don't define any
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!variables || variables.length === 0) {
    return dashboard;
  }

  const staticListPlugin = {
    kind: 'StaticListVariable' as const,
    spec: {
      values: namespaceOptions.map(({ name, label }) => ({
        label,
        value: name,
      })),
    },
  };

  const transformedVariables = variables.map((variable) => {
    if (!('name' in variable.spec) || variable.spec.name !== 'namespace') {
      return variable;
    }

    // ListVariable: preserve allowAllValue / allowMultiple; only drop wildcard All.
    if (variable.kind === 'ListVariable') {
      const { customAllValue: _omitCustomAll, ...listSpec } = variable.spec as ListVariableDefinition['spec'] & {
        customAllValue?: string;
      };

      return {
        kind: 'ListVariable' as const,
        spec: {
          ...listSpec,
          defaultValue: initialNamespaceValue ?? variable.spec.defaultValue,
          plugin: staticListPlugin,
        },
      };
    }

    // TextVariable / other (e.g. Models dashboard): inject multi-select Project list.
    return {
      kind: 'ListVariable' as const,
      spec: {
        name: 'namespace',
        display: {
          name: 'Project',
          description: 'Filter by project',
        },
        allowMultiple: true,
        allowAllValue: true,
        defaultValue: initialNamespaceValue ?? '$__all',
        plugin: staticListPlugin,
      },
    };
  });

  return {
    ...dashboard,
    spec: {
      ...dashboard.spec,
      variables: transformedVariables,
    },
  };
}
