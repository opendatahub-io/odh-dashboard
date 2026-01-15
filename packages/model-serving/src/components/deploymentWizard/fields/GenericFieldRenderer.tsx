import React from 'react';
import type { WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';

type GenericFieldRendererProps = {
  wizardState: UseModelDeploymentWizardState;
  parentId: string;
  externalData: ExternalDataMap;
};

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  wizardState,
  externalData,
}) => {
  const fields: WizardField<unknown>[] = React.useMemo(() => {
    return wizardState.fields.filter((f) => f.parentId === parentId);
  }, [parentId, wizardState.fields]);

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
            externalData: externalData[field.id],
          })}
        </React.Fragment>
      ))}
    </>
  );
};
