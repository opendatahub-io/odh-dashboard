import React from 'react';
import { resolveFieldValue, type GenericFieldProps, WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';
import { getFieldDependencies } from '../dynamicFormUtils';

type CommonProps = {
  wizardState: UseModelDeploymentWizardState;
  externalData?: ExternalDataMap;
  isDisabled?: boolean;
} & GenericFieldProps;

type GenericFieldRendererProps = CommonProps &
  ({ parentId: string; fieldId?: never } | { fieldId: string; parentId?: never });

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  fieldId,
  wizardState,
  externalData,
  isEditing,
  isDisabled,
}) => {
  const fields: WizardField<unknown>[] = React.useMemo(() => {
    if (fieldId) {
      return wizardState.fields.filter((f) => f.id === fieldId);
    }
    return wizardState.fields.filter((f) => f.parentId === parentId);
  }, [parentId, fieldId, wizardState.fields]);

  if (!fields.length) {
    return null;
  }

  return (
    <>
      {fields.map((field) => (
        <React.Fragment key={field.id}>
          {field.component({
            id: field.id,
            value: resolveFieldValue(field, wizardState.state),
            onChange: (value) => {
              wizardState.dispatch({
                type: 'setFieldData',
                payload: { id: field.id, data: value },
              });
            },
            externalData: externalData?.[field.id] ?? undefined,
            dependencies: getFieldDependencies(field, wizardState.state),
            isEditing,
            isDisabled,
          })}
        </React.Fragment>
      ))}
    </>
  );
};
