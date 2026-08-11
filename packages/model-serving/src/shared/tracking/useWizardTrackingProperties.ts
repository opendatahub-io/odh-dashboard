import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isWizardTrackingPropertiesExtension } from '../../../extension-points/deployment-wizard';
import type { WizardFormData } from '../types/form-data';

/**
 * Hook that collects per-platform tracking properties from spoke extensions.
 * Spokes register `model-serving.deployment/tracking-properties` extensions,
 * and this hook resolves and invokes the one matching the active platform.
 */
export const useWizardTrackingProperties = (
  wizardState: WizardFormData['state'],
  platformId?: string,
): {
  platformProperties: Record<string, string | number | boolean | undefined>;
  loaded: boolean;
} => {
  const [extensions, loaded] = useResolvedExtensions(isWizardTrackingPropertiesExtension);

  const platformProperties = React.useMemo((): Record<
    string,
    string | number | boolean | undefined
  > => {
    if (!platformId || !loaded) {
      return {};
    }

    const matchingExtension = extensions.find((ext) => ext.properties.platform === platformId);

    if (!matchingExtension) {
      return {};
    }

    return matchingExtension.properties.getProperties(wizardState);
  }, [extensions, loaded, platformId, wizardState]);

  return { platformProperties, loaded };
};
