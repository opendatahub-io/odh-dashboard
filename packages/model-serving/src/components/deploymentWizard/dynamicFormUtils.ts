import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { DeploymentWizardField, DeploymentWizardFieldId, WizardFormData } from './types';
import { isModifierField } from './types';
import { isDeploymentWizardFieldExtension } from '../../../extension-points';

export const useWizardFieldsFromExtensions = (): [DeploymentWizardField[], boolean, Error[]] => {
  const [extensions, loaded, errors] = useResolvedExtensions(isDeploymentWizardFieldExtension);
  const fields = React.useMemo(() => {
    return extensions.map((ext) => ext.properties.field);
  }, [extensions]);

  return React.useMemo(
    () => [
      fields,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [fields, loaded, errors],
  );
};

export const useExtensionStateModifier = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  fieldId: DeploymentWizardFieldId,
  originalHook: T,
  stateInput: Parameters<T>,
  formData: Partial<WizardFormData['state']>,
): ReturnType<T> => {
  const [fields] = useWizardFieldsFromExtensions();
  // const extensionField = fields.find((field) => field.id === fieldId);
  const stateOutput = originalHook(...stateInput);

  return React.useMemo(() => {
    const extensionField = fields.find((field) => field.id === fieldId && field.isActive(formData));
    if (extensionField && isModifierField<T>(extensionField)) {
      return extensionField.modifier(stateInput, stateOutput);
    }
    return stateOutput;
  }, [fields, fieldId, originalHook, stateInput]);
};
