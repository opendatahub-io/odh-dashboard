import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import { NAMESPACE_URL_PARAM } from '../utils/transformDashboardVariables';

/**
 * NamespaceUrlSync syncs the Perses namespace variable value to URL query parameters.
 *
 * This component must be rendered as a child of PersesWrapper to access the VariableProvider context.
 *
 * Note: Restoration from URL is handled by setting the `defaultValue` in the transformed
 * dashboard spec (see transformNamespaceVariable). This component only syncs changes
 * from the variable to the URL.
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

    const newValue = Array.isArray(namespaceState.value)
      ? namespaceState.value.join(',')
      : String(namespaceState.value);

    // On first render, just record the current value without updating URL
    // (the URL already has the correct value from the navigation)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      lastSyncedValue.current = newValue;
      return;
    }

    // Skip if this is the same value we last synced
    if (newValue === lastSyncedValue.current) {
      return;
    }

    // Skip if URL already has this value
    const currentUrlValue = searchParams.get(NAMESPACE_URL_PARAM);
    if (currentUrlValue === newValue) {
      lastSyncedValue.current = newValue;
      return;
    }

    // Update URL
    lastSyncedValue.current = newValue;
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        if (newValue && newValue !== '$__all') {
          newParams.set(NAMESPACE_URL_PARAM, newValue);
        } else {
          // Remove param if it's the default "all" value
          newParams.delete(NAMESPACE_URL_PARAM);
        }
        return newParams;
      },
      { replace: true },
    );
  }, [namespaceState?.value, namespaceState?.loading, searchParams, setSearchParams]);

  return null;
};

export default NamespaceUrlSync;
