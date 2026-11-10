import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import type { DashboardResource } from '@perses-dev/core';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import { useListVariablePluginValues, type VariableState } from '@perses-dev/plugin-system';
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

const NamespaceEmptyState: React.FC = () => (
  <EmptyState data-testid="namespace-empty-state" titleText="No project selected">
    <EmptyStateBody>Select at least one project to view dashboard metrics.</EmptyStateBody>
  </EmptyState>
);

const NamespaceLoadingState: React.FC = () => (
  <Bullseye data-testid="namespace-loading-state">
    <Spinner aria-label="Loading dashboard" />
  </Bullseye>
);

const NamespaceOptionsEmptyState: React.FC = () => (
  <EmptyState data-testid="namespace-options-empty-state" titleText="No projects available">
    <EmptyStateBody>No projects are available to view dashboard metrics.</EmptyStateBody>
  </EmptyState>
);

const NamespaceOptionsErrorState: React.FC = () => (
  <EmptyState data-testid="namespace-options-error-state" titleText="Unable to load projects">
    <EmptyStateBody>Project options could not be loaded. Try again later.</EmptyStateBody>
  </EmptyState>
);

type NamespaceVariableGateProps = {
  definition: Extract<
    ReturnType<typeof useVariableDefinitionAndState>['definition'],
    { kind: 'ListVariable' }
  >;
  state: VariableState | undefined;
  children: React.ReactNode;
};

const NamespaceVariableGate: React.FC<NamespaceVariableGateProps> = ({
  definition,
  state,
  children,
}) => {
  const namespaceOptionsQuery = useListVariablePluginValues(definition);
  const requiresOptions = usesUnexpandedDefaultAll(definition, state);
  const options = namespaceOptionsQuery.data ?? [];

  if (requiresOptions && namespaceOptionsQuery.isError && options.length === 0) {
    return <NamespaceOptionsErrorState />;
  }

  if (requiresOptions && namespaceOptionsQuery.isFetched && options.length === 0) {
    return <NamespaceOptionsEmptyState />;
  }

  if (!state || state.loading || (requiresOptions && !namespaceOptionsQuery.isFetched)) {
    return <NamespaceLoadingState />;
  }

  const namespaceReady = Boolean(
    hasVariableValue(state.value) &&
      (!requiresOptions || (namespaceOptionsQuery.isFetched && options.length > 0)),
  );

  if (namespaceReady) {
    return <>{children}</>;
  }

  const hasEmptySelection = !hasVariableValue(state.value);

  return hasEmptySelection ? <NamespaceEmptyState /> : null;
};

type NamespaceValueGateProps = {
  state: VariableState | undefined;
  children: React.ReactNode;
};

const NamespaceValueGate: React.FC<NamespaceValueGateProps> = ({ state, children }) => {
  if (!state || state.loading) {
    return <NamespaceLoadingState />;
  }

  const namespaceReady = hasVariableValue(state.value);

  if (namespaceReady) {
    return <>{children}</>;
  }

  const hasEmptySelection = !hasVariableValue(state.value);

  return hasEmptySelection ? <NamespaceEmptyState /> : null;
};

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

  return namespaceDefinition?.kind === 'ListVariable' ? (
    <NamespaceVariableGate definition={namespaceDefinition} state={namespaceState}>
      {children}
    </NamespaceVariableGate>
  ) : (
    <NamespaceValueGate state={namespaceState}>{children}</NamespaceValueGate>
  );
};
