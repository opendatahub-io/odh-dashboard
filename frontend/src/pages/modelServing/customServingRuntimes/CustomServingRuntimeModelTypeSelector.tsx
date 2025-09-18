import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { CheckboxSelect, CheckboxSelectOption } from '@patternfly/react-templates';
import { ServingRuntimeModelType } from '#~/types';

type CustomServingRuntimeModelTypeSelectorProps = {
  selectedModelTypes: ServingRuntimeModelType[];
  setSelectedModelTypes: (modelTypes: ServingRuntimeModelType[]) => void;
};

const Options: { content: string; value: ServingRuntimeModelType }[] = [
  { content: 'Predictive model', value: ServingRuntimeModelType.PREDICTIVE },
  { content: 'Generative AI model (e.g., LLM)', value: ServingRuntimeModelType.GENERATIVE },
];

const CustomServingRuntimeModelTypeSelector: React.FC<
  CustomServingRuntimeModelTypeSelectorProps
> = ({ selectedModelTypes, setSelectedModelTypes }) => {
  const modelTypeOptions = React.useMemo<CheckboxSelectOption[]>(
    () => Options.map((o) => ({ ...o, selected: selectedModelTypes.includes(o.value) })),
    [selectedModelTypes],
  );

  return (
    <FormGroup
      label="Select the model types this runtime supports"
      id="custom-serving-model-type-selection"
    >
      <CheckboxSelect
        toggleContent="Select model types"
        initialOptions={modelTypeOptions}
        onSelect={(_ev, value) => {
          if (
            typeof value === 'string' &&
            (value === ServingRuntimeModelType.PREDICTIVE ||
              value === ServingRuntimeModelType.GENERATIVE)
          ) {
            const val = value;
            const newSelected = selectedModelTypes.includes(val)
              ? selectedModelTypes.filter((item) => item !== val)
              : [...selectedModelTypes, val];
            setSelectedModelTypes(newSelected);
          }
        }}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimeModelTypeSelector;
