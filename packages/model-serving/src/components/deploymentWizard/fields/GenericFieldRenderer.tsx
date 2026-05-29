import React from 'react';
import { resolveFieldValue, type GenericFieldProps, WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';
import { getFieldDependencies, getStateKey } from '../dynamicFormUtils';

const hasDisabledOverride = (value: unknown): value is { isDisabled: boolean } =>
  typeof value === 'object' &&
  value !== null &&
  'isDisabled' in value &&
  typeof value.isDisabled === 'boolean';

type CommonProps = {
  wizardState: UseModelDeploymentWizardState;
  externalData?: ExternalDataMap;
  isDisabled?: boolean;
} & GenericFieldProps;

type GenericFieldRendererProps = CommonProps &
  (
    | { parentId: string; fieldId?: never; stateKey?: never }
    | { fieldId: string; parentId?: never; stateKey?: never }
    | { stateKey: string; parentId?: never; fieldId?: never }
  );

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  fieldId,
  stateKey,
  wizardState,
  externalData,
  isEditing,
  isDisabled,
}) => {
  const fields: WizardField[] = React.useMemo(() => {
    if (stateKey) {
      return wizardState.fields.filter((f) => f.stateKey === stateKey);
    }
    if (fieldId) {
      return wizardState.fields.filter((f) => f.id === fieldId);
    }
    return wizardState.fields.filter((f) => f.parentId === parentId);
  }, [parentId, fieldId, stateKey, wizardState.fields]);

  return (
    <>
      {fields.map((field) => {
        const FieldComponent = field.component;
        return (
          <React.Fragment key={field.id}>
            <FieldComponent
              id={getStateKey(field)}
              value={resolveFieldValue(field, wizardState.state)}
              initialValue={wizardState.initialData?.[getStateKey(field)]}
              onChange={(value: unknown) => {
                wizardState.dispatch({
                  type: 'setFieldData',
                  payload: { id: getStateKey(field), data: value },
                });
              }}
              externalData={externalData?.[field.id] ?? undefined}
              dependencies={getFieldDependencies(field, wizardState.state)}
              isEditing={isEditing}
              isDisabled={isDisabled || hasDisabledOverride(wizardState.state[getStateKey(field)])}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};
