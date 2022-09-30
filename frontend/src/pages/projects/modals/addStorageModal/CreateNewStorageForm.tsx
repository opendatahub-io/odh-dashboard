import * as React from 'react';
import { Flex, FlexItem, Form, FormGroup, TextInput } from '@patternfly/react-core';
import ConnectWorkbenchOptions from './ConnectWorkbenchOptions';

type CreateNewStorageFormProps = {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  size: string;
  setSize: (size: string) => void;
  selections: string[];
  setSelections: (selections: string[]) => void;
};

const CreateNewStorageForm: React.FC<CreateNewStorageFormProps> = ({
  name,
  setName,
  description,
  setDescription,
  size,
  setSize,
  selections,
  setSelections,
}) => {
  return (
    <Form>
      <FormGroup label="Name" fieldId="create-new-storage-name">
        <TextInput
          type="text"
          id="create-new-storage-name"
          name="create-new-storage-name"
          aria-labelledby="create-new-storage-name-helper"
          value={name}
          onChange={(newName) => setName(newName)}
        />
      </FormGroup>
      <FormGroup label="Description" fieldId="create-new-storage-description">
        <TextInput
          type="text"
          id="create-new-storage-description"
          name="create-new-storage-description"
          aria-labelledby="create-new-storage-description-helper"
          value={description}
          onChange={(newDesc) => setDescription(newDesc)}
        />
      </FormGroup>
      <FormGroup role="radiogroup" fieldId="connection-options-radio-group">
        <ConnectWorkbenchOptions
          allWorkbenches={[]}
          selections={selections}
          setSelections={setSelections}
        />
      </FormGroup>
      <FormGroup label="Size" fieldId="create-new-storage-size">
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <TextInput
              type="number"
              id="create-new-storage-size"
              name="create-new-storage-size"
              aria-labelledby="create-new-storage-size-helper"
              value={size}
              onChange={(newSize) => setSize(newSize)}
            />
          </FlexItem>
          <FlexItem>
            <span>GiB</span>
          </FlexItem>
        </Flex>
      </FormGroup>
    </Form>
  );
};

export default CreateNewStorageForm;
