import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { DeploymentWizardField, WizardField, WizardFormData } from './types';
import {
  isDeploymentWizardFieldExtension,
  isWizardField2Extension,
} from '../../../extension-points';

// Implementation
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
