import * as React from 'react';
import { Flex, FlexItem, Form, FormGroup, TextInput } from '@patternfly/react-core';

type CreateNewStorageFormProps = {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  size: string;
  setSize: (size: string) => void;
  workbenchOptions: React.ReactNode;
};

const CreateNewStorageForm: React.FC<CreateNewStorageFormProps> = ({
  name,
  setName,
  description,
  setDescription,
  size,
  setSize,
  workbenchOptions,
}) => {
  return (
    <Form>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
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
        </FlexItem>
        <FlexItem>
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
        </FlexItem>
        <FlexItem>
          <FormGroup role="radiogroup" fieldId="connection-options-radio-group">
            {workbenchOptions}
          </FormGroup>
        </FlexItem>
        <FlexItem>
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
        </FlexItem>
      </Flex>
    </Form>
  );
};

export default CreateNewStorageForm;
