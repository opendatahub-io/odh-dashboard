import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { DeploymentWizardField, DeploymentWizardFieldId, WizardFormData } from './types';
import { isModifierField } from './types';
import { isDeploymentWizardFieldExtension } from '../../../extension-points';

export const useWizardFieldsFromExtensions = (
  fieldId?: DeploymentWizardFieldId,
): [DeploymentWizardField[], boolean, Error[]] => {
  const [extensions, loaded, errors] = useResolvedExtensions(isDeploymentWizardFieldExtension);
  const fields = React.useMemo(() => {
    return extensions.map((ext) => ext.properties.field).filter((field) => field.id === fieldId);
  }, [extensions, fieldId]);

  return React.useMemo(
    () => [
      fields,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [fields, loaded, errors],
  );
};

/**
 * A React hook that allows extensions to modify the state output of existing hooks in the deployment wizard.
 *
 * This hook enables a plugin architecture where extensions can intercept and transform the results
 * of wizard field hooks without directly modifying the original implementation. It looks for active
 * modifier extensions matching the specified field ID and applies their transformations to the hook's output.
 *
 * @template OriginalHook - The type of the original hook function being modified
 * @param fieldId - The unique identifier for the deployment wizard field that extensions can target
 * @param originalHook - The original hook function whose output may be modified by extensions
 * @param hookArgs - The input parameters to pass to the original hook
 * @param formData - The current form state used to determine which extensions are active. This will be limited to data from hooks that have already been called.
 * @returns The potentially modified output from the original hook, or the original output if no active modifier extensions are found
 *
 * @example
 * ```tsx
 * const modelServer = useExtensionStateModifier(
 *   'modelServerTemplate',
 *   useModelServerSelectField,
 *   [initialData?.modelServer, projectName, templates, modelFormat, modelType],
 *   { modelType, modelFormat }
 * );
 * ```
 */
export const useExtensionStateModifier = <
  OriginalHook extends (...args: Parameters<OriginalHook>) => ReturnType<OriginalHook>,
>(
  fieldId: DeploymentWizardFieldId,
  originalHook: OriginalHook,
  hookArgs: Parameters<OriginalHook>,
  formData: Partial<WizardFormData['state']>,
): ReturnType<OriginalHook> => {
  const [extensionFields] = useWizardFieldsFromExtensions(fieldId);

  const originalOutput = originalHook(...hookArgs);

  return React.useMemo(() => {
    const activeExtension = extensionFields.find(
      (field) => field.id === fieldId && field.isActive(formData),
    );

    if (activeExtension && isModifierField<OriginalHook>(activeExtension)) {
      return activeExtension.modifier(hookArgs, originalOutput);
    }

    return originalOutput;
  }, [extensionFields, fieldId, hookArgs, originalOutput, formData]);
};

/**
 * Wraps a component in an effect that will call the callback when the component is unmounted.
 * This should help overuse of useEffect to where it is not needed.
 */
export const OnUnRender: React.FC<{
  children: React.ReactNode;
  callback: () => void;
}> = ({ children, callback }) => {
  React.useEffect(() => {
    return () => {
      callback();
    };
  }, [callback]);

  return children;
};
