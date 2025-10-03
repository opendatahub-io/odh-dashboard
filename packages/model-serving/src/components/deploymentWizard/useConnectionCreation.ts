import React from 'react';
import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from './types';
import {
  isModelServingConnectionCreation,
  type Deployment,
  type ModelServingConnectionCreation,
} from '../../../extension-points';

export const useConnectionCreation = (
  wizardData: WizardFormData['state'],
): {
  connectionMethod?: ResolvedExtension<ModelServingConnectionCreation<Deployment>>;
  connectionMethodLoaded: boolean;
  connectionMethodErrors: unknown[];
} => {
  const [connectionExtensions, connectionExtensionsLoaded, connectionExtensionsErrors] =
    useResolvedExtensions(isModelServingConnectionCreation);

  return React.useMemo(() => {
    const sortedConnectionExtensions = connectionExtensions
      .filter((e) =>
        typeof e.properties.isActive === 'function'
          ? e.properties.isActive(wizardData)
          : e.properties.isActive,
      )
      .toSorted((a, b) => (b.properties.priority ?? 0) - (a.properties.priority ?? 0));

    return {
      connectionMethod:
        sortedConnectionExtensions.length > 0 ? sortedConnectionExtensions[0] : undefined,
      connectionMethodLoaded: connectionExtensionsLoaded,
      connectionMethodErrors: connectionExtensionsErrors,
    };
  }, [connectionExtensions, wizardData]);
};
