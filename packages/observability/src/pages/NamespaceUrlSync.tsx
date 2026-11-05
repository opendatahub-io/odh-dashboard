import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import type { VariableOption } from '@perses-dev/components';
import { NAMESPACE_URL_PARAM } from '../utils/dashboardUtils';
import { isExpandedAllNamespaceSelection } from '../utils/transformDashboardVariables';

/**
 * NamespaceUrlSync syncs the Perses namespace variable value to URL query parameters.
 *
 * This component must be rendered as a child of PersesProvider to access the VariableProvider context.
 *
 * Note: Restoration from URL is handled by setting the `defaultValue` in the transformed
 * dashboard spec (see transformNamespaceVariable). This component only syncs changes
 * from the variable to the URL.
 *
 * Project=All must clear `var-namespace`. After StaticList expansion, Perses may report
 * All as the concrete option array — treat that the same as `$__all` so refresh does not
 * restore a pinned multi-select. Selecting every project is the same concrete set as All
 * for scoped queries, so URL sync clears the param in both cases (see
 * isExpandedAllNamespaceSelection).
 *
 * Option values come from VariableState.options (Perses public runtime API), not from
 * duck-typing the StaticListVariable plugin definition shape.
 */
const NamespaceUrlSync: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state: namespaceState } = useVariableDefinitionAndState('namespace');

  // Track the last value we synced to URL to avoid infinite loops
  const lastSyncedValue = React.useRef<string | null>(null);
  // Track if we've done the initial sync (to handle the first render)
  const hasInitialized = React.useRef(false);

  // Sync namespace value changes to URL
  React.useEffect(() => {
    // Don't sync if there's no value or it's still loading
    if (!namespaceState?.value || namespaceState.loading) {
      return;
    }

    const rawValue = namespaceState.value;
    const optionValues = variableOptionValues(namespaceState.options);
    // Multi-select without options yet: cannot tell All vs pin — wait.
    if (Array.isArray(rawValue) && optionValues.length === 0) {
      return;
    }
    const clearsUrl = shouldClearNamespaceUrlParam(rawValue, optionValues);
    const newValue = Array.isArray(rawValue) ? rawValue.join(',') : String(rawValue);
    // Sentinel for "All" so init / dedupe treat clear-URL the same whether Perses
    // reports `$__all` or the expanded concrete list.
    const syncKey = clearsUrl ? '$__all' : newValue;

    // On first render, just record the current value without updating URL
    // (the URL already has the correct value from the navigation)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      lastSyncedValue.current = syncKey;
      return;
    }

    // Skip if this is the same value we last synced
    if (syncKey === lastSyncedValue.current) {
      return;
    }

    // Skip if URL already matches (absent param == All)
    const currentUrlValue = searchParams.get(NAMESPACE_URL_PARAM);
    if (clearsUrl ? currentUrlValue === null : currentUrlValue === newValue) {
      lastSyncedValue.current = syncKey;
      return;
    }

    // Update URL
    lastSyncedValue.current = syncKey;
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        if (clearsUrl) {
          newParams.delete(NAMESPACE_URL_PARAM);
        } else {
          newParams.set(NAMESPACE_URL_PARAM, newValue);
        }
        return newParams;
      },
      { replace: true },
    );
  }, [
    namespaceState?.options,
    namespaceState?.value,
    namespaceState?.loading,
    searchParams,
    setSearchParams,
  ]);

  return null;
};

function shouldClearNamespaceUrlParam(value: string | string[], optionValues: string[]): boolean {
  if (value === '$__all') {
    return true;
  }
  if (Array.isArray(value) && isExpandedAllNamespaceSelection(value, optionValues)) {
    return true;
  }
  return false;
}

/** Values from Perses VariableState.options (`{ label, value }[]`). */
function variableOptionValues(options: VariableOption[] | undefined): string[] {
  if (!options?.length) {
    return [];
  }
  return options.map((opt) => opt.value).filter(Boolean);
}

export default NamespaceUrlSync;
