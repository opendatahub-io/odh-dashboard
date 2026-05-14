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
 * Where in the form state is the field data stored?
 * Needed for fields that do the same thing but work differently in different platforms.
 * @param field The field to get the form id for
 * @returns The form id or the field id if no form id is set
 */
export const getFormId = (field: WizardField<unknown>): string => {
  return field.formId ?? field.id;
};
