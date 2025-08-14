import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

const CustomServingRuntimeModelTypeSelector: React.FC = () => {
  const [selectedValue, setSelectedValue] = React.useState<string>('');

  const options: SimpleSelectOption[] = [
    {
      key: 'Predictive model',
      label: 'Predictive model',
    },
    {
      key: 'Generative AI model (e.g., LLM)',
      label: 'Generative AI model (e.g., LLM)',
    },
  ];

  return (
    <FormGroup
      label="Select the model type this runtime supports"
      fieldId="custom-serving-model-type-selection"
      isRequired
    >
      <SimpleSelect
        dataTestId="custom-serving-model-type-selection"
        aria-label="Select a model type"
        placeholder="Select a value"
        options={options}
        value={selectedValue}
        onChange={(key) => setSelectedValue(key)}
        popperProps={{ maxWidth: undefined }}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimeModelTypeSelector;
