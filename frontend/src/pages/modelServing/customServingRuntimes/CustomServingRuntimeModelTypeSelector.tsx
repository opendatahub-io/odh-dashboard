import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ServingRuntimeModelType } from '#~/types';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

type CustomServingRuntimeModelTypeSelectorProps = {
  selectedModelTypes: ServingRuntimeModelType[];
  setSelectedModelTypes: (modelTypes: ServingRuntimeModelType[]) => void;
};

const CustomServingRuntimeModelTypeSelector: React.FC<
  CustomServingRuntimeModelTypeSelectorProps
> = ({ selectedModelTypes, setSelectedModelTypes }) => {
  const options: SelectionOptions[] = [
    {
      id: ServingRuntimeModelType.PREDICTIVE,
      name: 'Predictive model',
      selected: selectedModelTypes.includes(ServingRuntimeModelType.PREDICTIVE),
    },
    {
      id: ServingRuntimeModelType.GENERATIVE,
      name: 'Generative AI model (e.g., LLM)',
      selected: selectedModelTypes.includes(ServingRuntimeModelType.GENERATIVE),
    },
  ];

  const handleSelectionChange = (newState: SelectionOptions[]) => {
    const selectedTypes: ServingRuntimeModelType[] = [];
    newState.forEach((option) => {
      if (option.selected) {
        if (option.id === ServingRuntimeModelType.PREDICTIVE) {
          selectedTypes.push(ServingRuntimeModelType.PREDICTIVE);
        } else if (option.id === ServingRuntimeModelType.GENERATIVE) {
          selectedTypes.push(ServingRuntimeModelType.GENERATIVE);
        }
      }
    });
    setSelectedModelTypes(selectedTypes);
  };

  return (
    <FormGroup
      label="Select the model type this runtime supports"
      fieldId="serving-model-type-selection"
    >
      <div style={{ width: 'fit-content' }}>
        <MultiSelection
          ariaLabel="Select model types"
          value={options}
          setValue={handleSelectionChange}
          placeholder="Select model types"
          toggleTestId="serving-model-type-selection"
          id="serving-model-type-selection"
          toggleId="serving-model-type-selection"
        />
      </div>
    </FormGroup>
  );
};

export default CustomServingRuntimeModelTypeSelector;
