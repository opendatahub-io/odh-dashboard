import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isWizardTrackingPropertiesExtension } from '../../../extension-points/deployment-wizard';
import type { ExternalDataMap } from '../../components/deploymentWizard/ExternalDataLoader';
import type { WizardFormData } from '../types/form-data';

/**
 * Hook that provides a lazy async getter for per-platform tracking properties.
 * Uses useExtensions (without Resolved) so the CodeRef is only resolved at submit
 * time — avoiding unnecessary network load during page render.
 */
export const useWizardTrackingProperties = (
  wizardState: WizardFormData['state'],
  platformId?: string,
): {
  getTrackingProperties: (
    externalData?: ExternalDataMap,
  ) => Promise<Record<string, string | number | boolean | undefined>>;
} => {
  const extensions = useExtensions(isWizardTrackingPropertiesExtension);

  const getTrackingProperties = React.useCallback(
    async (
      externalData?: ExternalDataMap,
    ): Promise<Record<string, string | number | boolean | undefined>> => {
      if (!platformId) {
        return {};
      }

      const matchingExtension = extensions.find((ext) => ext.properties.platform === platformId);

      if (!matchingExtension) {
        return {};
      }

      try {
        const resolvedFn = await matchingExtension.properties.getProperties();
        return resolvedFn(wizardState, externalData);
      } catch {
        return {};
      }
    },
    [extensions, platformId, wizardState],
  );

  return { getTrackingProperties };
};
