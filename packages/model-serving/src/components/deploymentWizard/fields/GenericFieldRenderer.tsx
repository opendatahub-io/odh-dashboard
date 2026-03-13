import React from 'react';
import { resolveFieldValue, type WizardField } from '../types';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';

type GenericFieldRendererProps = {
  wizardState: UseModelDeploymentWizardState;
  parentId: string;
  externalData?: ExternalDataMap;
  isDisabled?: boolean;
};

export const GenericFieldRenderer: React.FC<GenericFieldRendererProps> = ({
  parentId,
  wizardState,
  externalData,
  isDisabled,
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
            value: resolveFieldValue(field, wizardState.state),
            onChange: (value) => {
              wizardState.dispatch({
                type: 'setFieldData',
                payload: { id: field.id, data: value },
              });
            },
            externalData: externalData?.[field.id] ?? undefined,
            isDisabled,
          })}
        </React.Fragment>
      ))}
    </>
  );
};
