import React from 'react';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';

type RegisteredModelSelectorProps = {
  registeredModels: RegisteredModel[];
  registeredModelId: string;
  setRegisteredModelId: (id: string) => void;
};

const RegisteredModelSelector: React.FC<RegisteredModelSelectorProps> = ({
  registeredModels,
  registeredModelId,
  setRegisteredModelId,
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      registeredModels.map(({ name, id }) => ({
        content: name,
        value: id,
        isSelected: id === registeredModelId,
      })),
    [registeredModels, registeredModelId],
  );

  return (
    <TypeaheadSelect
      id="model-name"
      onClearSelection={() => setRegisteredModelId('')}
      selectOptions={options}
      isScrollable
      placeholder="Select a registered model"
      noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
      onSelect={(_event, selection) => {
        setRegisteredModelId(String(selection));
      }}
    />
  );
};

export default RegisteredModelSelector;
