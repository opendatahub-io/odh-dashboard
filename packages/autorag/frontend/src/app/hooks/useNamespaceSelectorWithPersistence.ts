import { useMemo } from 'react';
import { useNamespaceSelector } from 'mod-arch-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';

export function useNamespaceSelectorWithPersistence(): ReturnType<typeof useNamespaceSelector> {
  const enabled = useIsAreaAvailable(SupportedArea.UNIFIED_PROJECT_SELECTOR).status;
  // The host owns the preference under UPS; do not restore or write a second stored namespace.
  const legacy = useNamespaceSelector({ storeLastNamespace: !enabled });
  const { projects, activeProject, status } = useWorkingProject();
  const namespaces = useMemo(
    () =>
      enabled
        ? projects.map(({ name, displayName }) => ({ name, displayName: displayName ?? name }))
        : legacy.namespaces,
    [enabled, legacy.namespaces, projects],
  );
  // UPS owns discovery, including individually validated projects when listing is restricted.
  // A separate legacy namespace-list failure must not block a host-validated project.
  return enabled
    ? {
        ...legacy,
        namespaces,
        namespacesLoaded: status !== WorkingProjectStatusValue.Loading,
        namespacesLoadError: undefined,
        initializationError: undefined,
        preferredNamespace: namespaces.find(({ name }) => name === activeProject?.name),
      }
    : legacy;
}
