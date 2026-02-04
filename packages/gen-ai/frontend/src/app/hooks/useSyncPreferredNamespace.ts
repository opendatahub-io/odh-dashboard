import * as React from 'react';
import { Namespace, useModularArchContext } from 'mod-arch-core';
import { setPreferredProject } from '@odh-dashboard/internal/concepts/projects/preferredProjectStorage';

const useSyncPreferredNamespace = (newPreferredNamespace: Namespace | undefined): void => {
  const { preferredNamespace, updatePreferredNamespace } = useModularArchContext();

  React.useEffect(() => {
    if (newPreferredNamespace?.name !== preferredNamespace?.name) {
      updatePreferredNamespace(newPreferredNamespace);

      // Also update sessionStorage so ODH can read the preferred project when navigating back
      if (newPreferredNamespace?.name) {
        setPreferredProject(newPreferredNamespace.name);
      }
    }
  }, [newPreferredNamespace, preferredNamespace, updatePreferredNamespace]);
};

export default useSyncPreferredNamespace;
