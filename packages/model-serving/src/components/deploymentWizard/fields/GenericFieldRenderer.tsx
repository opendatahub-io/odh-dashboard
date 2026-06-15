import React from 'react';
import type { WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type GenericFieldRendererProps = {
  wizardState: UseModelDeploymentWizardState;
  parentId?: string;
  fieldId?: string;
};

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  wizardState,
  fieldId,
}) => {
  const fields: WizardField<unknown>[] = React.useMemo(() => {
    if (fieldId) {
      return wizardState.fields.filter((f) => f.id === fieldId);
    }
    if (parentId) {
      return wizardState.fields.filter((f) => f.parentId === parentId);
    }
    return [];
  }, [parentId, fieldId, wizardState.fields]);

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
          })}
        </React.Fragment>
      ))}
    </>
  );
};
