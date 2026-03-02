import React from 'react';
import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
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
  navSourceMetadata?: K8sResourceCommon['metadata'],
): {
  applyFieldData: (deployment: Deployment) => Deployment;
  applyExtensionsLoaded: boolean;
  applyExtensionErrors: Error[];
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
      if (navSourceMetadata) {
        if (navSourceMetadata.labels) {
          result.model.metadata.labels = {
            ...result.model.metadata.labels,
            ...navSourceMetadata.labels,
          };
        }
        if (navSourceMetadata.annotations) {
          result.model.metadata.annotations = {
            ...result.model.metadata.annotations,
            ...navSourceMetadata.annotations,
          };
        }
      }

      return result;
    },
    [activeApplyExtensions, wizardState, navSourceMetadata],
  );

  return React.useMemo(
    () => ({
      applyFieldData,
      applyExtensionsLoaded,
      applyExtensionErrors: applyExtensionErrors.filter(
        (error): error is Error => error instanceof Error,
      ),
    }),
    [applyFieldData, applyExtensionsLoaded, applyExtensionErrors],
  );
};
