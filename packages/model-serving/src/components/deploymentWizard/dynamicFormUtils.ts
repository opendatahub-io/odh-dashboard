import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type {
  DeploymentWizardField,
  DeploymentWizardFieldId,
  ModelServerTemplateField,
  ModelAvailabilityField,
  ExternalRouteField,
  TokenAuthField,
} from './types';
import { isDeploymentWizardFieldExtension } from '../../../extension-points';

// Type mapping from field ID to specific field type
type FieldIdToTypeMap = {
  modelServerTemplate: ModelServerTemplateField;
  modelAvailability: ModelAvailabilityField;
  externalRoute: ExternalRouteField;
  tokenAuth: TokenAuthField;
};

// Helper type to extract the field type based on the field ID
type ExtractFieldType<T extends DeploymentWizardFieldId | undefined> = T extends undefined
  ? DeploymentWizardField
  : T extends DeploymentWizardFieldId
  ? FieldIdToTypeMap[T]
  : never;

// Overload signatures for better type inference
export function useWizardFieldsFromExtensions<T extends DeploymentWizardFieldId>(
  fieldId: T,
): [ExtractFieldType<T>[], boolean, Error[]];
export function useWizardFieldsFromExtensions(
  fieldId?: undefined,
): [DeploymentWizardField[], boolean, Error[]];

// Implementation
export function useWizardFieldsFromExtensions<T extends DeploymentWizardFieldId | undefined>(
  fieldId?: T,
): [ExtractFieldType<T>[], boolean, Error[]] {
  const [extensions, loaded, errors] = useResolvedExtensions(isDeploymentWizardFieldExtension);
  // Type assertion is safe here: when fieldId is provided, the filter ensures all returned
  // fields match that ID, and the overload signatures guarantee the correct return type
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const fields = React.useMemo(() => {
    const all = extensions.map((ext) => ext.properties.field);
    return fieldId ? all.filter((field) => field.id === fieldId) : all;
  }, [extensions, fieldId]) as ExtractFieldType<T>[];

  return React.useMemo(
    () => [
      fields,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [fields, loaded, errors],
  );
}
