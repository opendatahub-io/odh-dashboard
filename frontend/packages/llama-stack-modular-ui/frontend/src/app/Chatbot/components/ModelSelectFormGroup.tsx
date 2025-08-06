import * as React from 'react';
import { FormGroup, FormSelect, FormSelectOption } from '@patternfly/react-core';

interface ModelSelectFormGroupProps {
  models: Array<{ identifier: string }>;
  selectedModel: string;
  onModelChange: (value: string) => void;
}

const ModelSelectFormGroup: React.FunctionComponent<ModelSelectFormGroupProps> = ({
  models,
  selectedModel,
  onModelChange,
}) => (
  <FormGroup label="Model" fieldId="model-select">
    <FormSelect
      value={selectedModel}
      onChange={(_event, value) => onModelChange(value)}
      aria-label="Select Model"
      isDisabled={models.length === 0}
    >
      {models.length === 0 ? (
        <FormSelectOption key="no-models" value="" label="No models available" isDisabled />
      ) : (
        <>
          <FormSelectOption key="select" value="" label="Select a model" isDisabled />
          {models.map((model, index) => (
            <FormSelectOption key={index + 1} value={model.identifier} label={model.identifier} />
          ))}
        </>
      )}
    </FormSelect>
  </FormGroup>
);

export { ModelSelectFormGroup };
