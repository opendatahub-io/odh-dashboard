import * as React from 'react';
import { FormGroup, Stack, StackItem, TextInput } from '@patternfly/react-core';

type NewStorageNameDescFieldsProps = {
  nameFieldId: string;
  descriptionFieldId: string;
  name: string;
  description: string;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
};

const NewStorageNameDescFields: React.FC<NewStorageNameDescFieldsProps> = ({
  nameFieldId,
  descriptionFieldId,
  name,
  description,
  setName,
  setDescription,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" fieldId={nameFieldId}>
          <TextInput
            type="text"
            id={nameFieldId}
            name={nameFieldId}
            aria-labelledby={nameFieldId}
            value={name}
            onChange={(name) => setName(name)}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Description" fieldId={descriptionFieldId}>
          <TextInput
            type="text"
            id={descriptionFieldId}
            name={descriptionFieldId}
            aria-labelledby={descriptionFieldId}
            value={description}
            onChange={(description) => setDescription(description)}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default NewStorageNameDescFields;
