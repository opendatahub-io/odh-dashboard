import type { DashboardResource } from '@perses-dev/core';

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
  initialNamespaceValue?: string | string[] | null,
): DashboardResource {
  // No project list → leave the CR as-is (Models keeps an empty TextVariable stub).
  // DashboardView must filter namespace dashboards when projects are empty so the stub
  // never drives ${namespace:queryparam} queries with value "".
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

  const optionValues = new Set(namespaceOptions.map(({ name }) => name));
  // Prefer URL / caller value; Perses VariableValue may be null.
  const preferredDefault = normalizeNamespaceDefault(initialNamespaceValue);

  const transformedVariables = variables.map((variable) => {
    if (!('name' in variable.spec) || variable.spec.name !== 'namespace') {
      return variable;
    }

    // ListVariable: preserve allowAllValue / allowMultiple; only drop wildcard All.
    if (variable.kind === 'ListVariable') {
      const listSpec = { ...variable.spec };
      delete listSpec.customAllValue;

      const allowAll = variable.spec.allowAllValue === true;
      const fallbackDefault = allowAll ? '$__all' : namespaceOptions[0].name;
      const fromSpec = normalizeNamespaceDefault(variable.spec.defaultValue);
      const candidate = preferredDefault ?? fromSpec;
      const defaultValue = isUsableNamespaceDefault(candidate, allowAll, optionValues)
        ? candidate
        : fallbackDefault;

      return {
        kind: 'ListVariable' as const,
        spec: {
          ...listSpec,
          defaultValue,
          plugin: staticListPlugin,
        },
      };
    }

    // TextVariable / other (e.g. Models dashboard): inject multi-select Project list.
    // Same default validation as ListVariable — do not special-case "$__all" blindly.
    const allowAll = true;
    const fallbackDefault = '$__all';
    const defaultValue = isUsableNamespaceDefault(preferredDefault, allowAll, optionValues)
      ? preferredDefault
      : fallbackDefault;

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
        defaultValue,
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

/** Coerce Perses VariableValue (string | string[] | null) to a usable default input. */
export function normalizeNamespaceDefault(
  value: string | string[] | null | undefined,
): string | string[] | undefined {
  return value === null ? undefined : value;
}

/**
 * True when a multi-select value is the expanded form of Project=All
 * (every StaticList option selected). Used so URL sync can clear var-namespace
 * instead of writing a comma-joined full list that restores as a pinned selection.
 *
 * Product note: intentionally selecting every project is indistinguishable from All
 * after Perses expansion — URL sync treats both as All (param cleared). That matches
 * scoped SAR (same concrete namespace set) and avoids a false pin on refresh.
 */
export function isExpandedAllNamespaceSelection(
  value: string[],
  optionValues: Iterable<string>,
): boolean {
  const options = optionValues instanceof Set ? optionValues : new Set(optionValues);
  if (options.size === 0) {
    return false;
  }
  // Distinct count first so duplicates like ['a','a'] cannot match options ['a','b'].
  const selected = new Set(value);
  if (selected.size !== options.size) {
    return false;
  }
  for (const entry of selected) {
    if (!options.has(entry)) {
      return false;
    }
  }
  return true;
}

/** True when the value is a valid ListVariable default for the replacement project list. */
export function isUsableNamespaceDefault(
  value: string | string[] | undefined,
  allowAll: boolean,
  optionValues: Set<string>,
): value is string | string[] {
  if (value === undefined) {
    return false;
  }
  if (value === '$__all') {
    return allowAll;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return false;
    }
    if (value.length === 1 && value[0] === '$__all') {
      return allowAll;
    }
    return value.every((entry) => optionValues.has(entry));
  }
  return optionValues.has(value);
}
