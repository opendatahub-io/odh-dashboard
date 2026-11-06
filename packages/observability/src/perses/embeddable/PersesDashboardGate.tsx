import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import type { DashboardResource } from '@perses-dev/core';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import type { VariableState } from '@perses-dev/plugin-system';
import { hasNamespaceVariable } from '../../utils/dashboardUtils';

const DEFAULT_ALL_VALUE = '$__all';

export type PersesDashboardGateProps = {
  dashboardResource: DashboardResource;
  children: React.ReactNode;
};

const hasVariableValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === 'string'
    ? value.trim().length > 0
    : value !== null && value !== undefined;
};

const usesUnexpandedDefaultAll = (
  definition: ReturnType<typeof useVariableDefinitionAndState>['definition'],
  state: VariableState | undefined,
): boolean =>
  definition?.kind === 'ListVariable' &&
  definition.spec.allowAllValue === true &&
  state?.value === DEFAULT_ALL_VALUE &&
  !definition.spec.customAllValue &&
  !state.customAllValue;

/**
 * Delays panel rendering until the namespace variable has an initial value.
 * The variable controls datasource query parameters, so rendering panels before
 * it is initialized can issue an invalid query without a namespace.
 */
export const PersesDashboardGate: React.FC<PersesDashboardGateProps> = ({
  dashboardResource,
  children,
}) => {
  const { definition: namespaceDefinition, state: namespaceState } =
    useVariableDefinitionAndState('namespace');

  if (!hasNamespaceVariable(dashboardResource)) {
    return <>{children}</>;
  }

  const namespaceReady = Boolean(
    namespaceState &&
      !namespaceState.loading &&
      hasVariableValue(namespaceState.value) &&
      (!usesUnexpandedDefaultAll(namespaceDefinition, namespaceState) ||
        (namespaceState.options?.length ?? 0) > 0),
  );

  if (namespaceReady) {
    return <>{children}</>;
  }

  const hasEmptySelection = Boolean(
    namespaceState && !namespaceState.loading && !hasVariableValue(namespaceState.value),
  );

  return hasEmptySelection ? (
    <EmptyState data-testid="namespace-empty-state" titleText="No project selected">
      <EmptyStateBody>Select at least one project to view dashboard metrics.</EmptyStateBody>
    </EmptyState>
  ) : null;
};
