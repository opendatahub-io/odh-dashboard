import type { DashboardResource } from '@perses-dev/core';

export const NAMESPACE_URL_PARAM = 'var-namespace';

/**
 * Transforms a dashboard resource by replacing the namespace variable's plugin
 * from PrometheusLabelValuesVariable to StaticListVariable with the given project names.
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
  // If no project names provided, return dashboard unchanged (will use Prometheus query)
  if (projectNames.length === 0) {
    return dashboard;
  }

  const { variables } = dashboard.spec;
  if (variables.length === 0) {
    return dashboard;
  }

  // Find and transform the namespace variable
  const transformedVariables = variables.map((variable) => {
    // Check if this is the namespace variable (ListVariable with name 'namespace')
    if (
      variable.kind === 'ListVariable' &&
      'name' in variable.spec &&
      variable.spec.name === 'namespace'
    ) {
      // Create a StaticListVariable with the project names
      return {
        kind: 'ListVariable' as const,
        spec: {
          ...variable.spec,
          // Use the initial value from URL if provided, otherwise keep the original default
          defaultValue: initialNamespaceValue ?? variable.spec.defaultValue,
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
