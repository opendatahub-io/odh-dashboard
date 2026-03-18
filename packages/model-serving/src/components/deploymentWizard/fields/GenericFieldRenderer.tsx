import React from 'react';
import type { GenericFieldProps, WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';
import { getFieldDependencies } from '../dynamicFormUtils';

type GenericFieldRendererProps = {
  wizardState: UseModelDeploymentWizardState;
  parentId?: string;
  fieldId?: string;
  externalData?: ExternalDataMap;
} & GenericFieldProps;

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  fieldId,
  wizardState,
  externalData,
  isEditing,
}) => {
  const fields: WizardField<unknown>[] = React.useMemo(() => {
    return wizardState.fields.filter((f) => f.parentId === parentId || f.id === fieldId);
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
            value: wizardState.state[field.id],
            onChange: (value) => {
              wizardState.dispatch({
                type: 'setFieldData',
                payload: { id: field.id, data: value },
              });
            },
            externalData: externalData?.[field.id] ?? undefined,
            dependencies: getFieldDependencies(field, wizardState.state),
            isEditing,
          })}
        </React.Fragment>
      ))}
    </>
  );
};
