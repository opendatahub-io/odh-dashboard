import React from 'react';
import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from './types';
import {
  isWizardFieldApplyExtension,
  isWizardField2Extension,
  type Deployment,
  type WizardFieldApplyExtension,
} from '../../../extension-points';

type ResolvedApplyExtension = ResolvedExtension<WizardFieldApplyExtension<unknown, Deployment>>;

/**
 * Hook that returns a function to apply all active wizard field data to a deployment during assembly.
 * Apply extensions are only executed if their associated WizardField2 is active.
 *
 * @param wizardState - The current wizard form state
 * @returns Object containing the apply function and loading state
 */
export const useWizardFieldApply = (
  wizardState: WizardFormData['state'],
): {
  applyFieldData: (deployment: Deployment) => Deployment;
  applyExtensionsLoaded: boolean;
  applyExtensionErrors: unknown[];
} => {
  const [applyExtensions, applyExtensionsLoaded, applyExtensionErrors] = useResolvedExtensions(
    isWizardFieldApplyExtension,
  );

  const [fieldExtensions] = useResolvedExtensions(isWizardField2Extension);

  // Get the set of active field IDs
  const activeFieldIds = React.useMemo(() => {
    return new Set(
      fieldExtensions
        .filter((ext) => ext.properties.field.isActive(wizardState))
        .map((ext) => ext.properties.field.id),
    );
  }, [fieldExtensions, wizardState]);

  // Filter apply extensions to only those whose associated field is active
  const activeApplyExtensions = React.useMemo((): ResolvedApplyExtension[] => {
    return applyExtensions.filter((ext) => activeFieldIds.has(ext.properties.fieldId));
  }, [applyExtensions, activeFieldIds]);

  const applyFieldData = React.useCallback(
    (deployment: Deployment): Deployment => {
      let result = deployment;

      for (const applyExt of activeApplyExtensions) {
        const { fieldId } = applyExt.properties;
        const fieldData: unknown = wizardState[fieldId];

        if (fieldData !== undefined) {
          result = applyExt.properties.apply(result, fieldData, wizardState);
        }
      }

      return result;
    },
    [activeApplyExtensions, wizardState],
  );

  return {
    applyFieldData,
    applyExtensionsLoaded,
    applyExtensionErrors,
  };
};
