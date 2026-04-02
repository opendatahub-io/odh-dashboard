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
  const fields: WizardField[] = React.useMemo(() => {
    if (fieldId) {
      return wizardState.fields.filter((f) => f.id === fieldId);
    }
    return wizardState.fields.filter((f) => f.parentId === parentId);
  }, [parentId, fieldId, wizardState.fields]);

  return (
    <>
      {fields.map((field) => {
        const FieldComponent = field.component;
        return (
          <React.Fragment key={field.id}>
            <FieldComponent
              id={field.id}
              value={resolveFieldValue(field, wizardState.state)}
              initialValue={wizardState.initialData?.[field.id]}
              onChange={(value: unknown) => {
                wizardState.dispatch({
                  type: 'setFieldData',
                  payload: { id: field.id, data: value },
                });
              }}
              externalData={externalData?.[field.id] ?? undefined}
              dependencies={getFieldDependencies(field, wizardState.state)}
              isEditing={isEditing}
              isDisabled={isDisabled}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};
