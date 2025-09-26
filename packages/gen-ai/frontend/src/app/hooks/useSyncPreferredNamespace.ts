import * as React from 'react';
import { Namespace, useModularArchContext } from 'mod-arch-core';

const useSyncPreferredNamespace = (newPreferredNamespace: Namespace | undefined): void => {
  const { preferredNamespace, updatePreferredNamespace } = useModularArchContext();

  React.useEffect(() => {
    if (newPreferredNamespace?.name !== preferredNamespace?.name) {
      updatePreferredNamespace(newPreferredNamespace);
    }
  }, [newPreferredNamespace, preferredNamespace, updatePreferredNamespace]);
};

export default useSyncPreferredNamespace;
