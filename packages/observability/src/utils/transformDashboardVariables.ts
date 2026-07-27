import type { DashboardResource } from '@perses-dev/core';

/**
 * Transforms a dashboard resource by replacing the namespace variable's plugin
 * with a StaticListVariable for the given project names.
 *
 * This prevents Perses from running a Prometheus query when we have project names
 * to inject, eliminating race conditions between the query and our manual options.
 *
 * @param dashboard - The original dashboard resource
 * @param projectNames - Array of project names to use as namespace options
 * @param initialNamespaceValue - Optional initial value for the namespace variable (from URL)
 * @returns A new dashboard resource with the namespace variable transformed
 */
export function transformNamespaceVariable(
  dashboard: DashboardResource,
  projectNames: string[],
  initialNamespaceValue?: string | string[],
): DashboardResource {
  // If no project names provided, return dashboard unchanged
  if (projectNames.length === 0) {
    return dashboard;
  }

  const { variables } = dashboard.spec;
  // variables may be undefined at runtime for dashboards that don't define any
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!variables || variables.length === 0) {
    return dashboard;
  }

  // Find and transform the namespace variable
  const transformedVariables = variables.map((variable) => {
    // Check if this is the namespace variable with name 'namespace'
    if ('name' in variable.spec && variable.spec.name === 'namespace') {
      // Create a StaticListVariable with the project names
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
          customAllValue: `(${projectNames.join('|')})`,
          // Use the initial value from URL if provided, otherwise keep the original default
          defaultValue: initialNamespaceValue ?? '$__all',
          plugin: {
            kind: 'StaticListVariable',
            spec: {
              values: projectNames.map((name) => ({
                label: name,
                value: name,
              })),
            },
          },
        },
      };
    }
    return variable;
  });

  // Return a new dashboard resource with transformed variables
  return {
    ...dashboard,
    spec: {
      ...dashboard.spec,
      variables: transformedVariables,
    },
  };
}
