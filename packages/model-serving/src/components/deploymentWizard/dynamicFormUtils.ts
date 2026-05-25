import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { DeploymentWizardField, WizardField, WizardFormData } from './types';
import {
  isDeploymentWizardFieldExtension,
  isWizardField2Extension,
} from '../../../extension-points';

/**
 * @deprecated Use useWizardFieldOverrides instead
 */
export const useWizardFieldFromExtension = <T extends DeploymentWizardField>(
  predicate: (field: DeploymentWizardField) => field is T,
  formData: RecursivePartial<WizardFormData['state']>,
): T | undefined => {
  const [extensions] = useResolvedExtensions(isDeploymentWizardFieldExtension);

  const fields = React.useMemo(() => {
    const all = extensions.map((ext) => ext.properties.field);
    return all.filter(predicate).filter((field) => field.isActive(formData));
  }, [extensions, predicate, formData]);

  return React.useMemo(() => fields[0], [fields]);
};

export const useWizardFieldOverrides = <T extends DeploymentWizardField>(
  predicate: (field: DeploymentWizardField) => field is T,
  formData: RecursivePartial<WizardFormData['state']>,
): T[] => {
  const [extensions] = useResolvedExtensions(isDeploymentWizardFieldExtension);

  return React.useMemo(() => {
    const all = extensions.map((ext) => ext.properties.field);
    return all.filter(predicate).filter((field) => field.isActive(formData));
  }, [extensions, predicate, formData]);
};

export const useActiveFields = (
  formData: RecursivePartial<WizardFormData['state']>,
): WizardField<unknown>[] => {
  const [extensions] = useResolvedExtensions(isWizardField2Extension);

  return React.useMemo(() => {
    return extensions
      .filter((ext) => ext.properties.field.isActive(formData))
      .map((ext) => ext.properties.field);
  }, [extensions, formData]);
};

export const getFieldDependencies = (
  field: WizardField<unknown>,
  formData: WizardFormData['state'],
): Record<string, unknown> => {
  return field.reducerFunctions.resolveDependencies?.(formData) ?? {};
};

/**
 * Determines where in the form state a field's data is stored.
 *
 * The stateKey allows multiple platform-specific fields to share the same form slot.
 * For example, kserve and llmd-serving both manage the "modelServer" form field
 * but with different implementations:
 * - kserve field: { id: 'kserve/modelServer', stateKey: 'modelServer' }
 * - llmd field: { id: 'llmd/modelServer', stateKey: 'modelServer' }
 *
 * Both store their data at state.modelServer, and only the active field is used
 * based on the isActive() predicate.
 *
 * @param field The wizard field to get the form id for
 * @returns The stateKey if explicitly set, otherwise falls back to the field's id
 *
 * @example
 * // Platform-specific field sharing a form slot
 * const kserveField = {
 *   id: 'kserve/modelServer',
 *   stateKey: 'modelServer',  // Shares slot with other platform fields
 *   // ...
 * };
 * getStateKey(kserveField); // Returns 'modelServer'
 *
 * @example
 * // Standard field without shared slot
 * const standardField = {
 *   id: 'externalRoute',
 *   // stateKey not set
 * };
 * getStateKey(standardField); // Returns 'externalRoute'
 */
export const getStateKey = (field: WizardField<unknown>): string => {
  return field.stateKey ?? field.id;
};
