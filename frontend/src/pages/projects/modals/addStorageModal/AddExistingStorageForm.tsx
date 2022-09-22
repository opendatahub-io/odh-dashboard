import * as React from 'react';
import { Select, Form, FormGroup, FlexItem, Flex } from '@patternfly/react-core';
import { ExistingStorage } from './types';

type AddExistingStorageFormProps = {
  selections: ExistingStorage;
  onClear: (storageOnly: boolean) => void;
  onUpdate: (selection: string, storageOnly: boolean) => void;
};

const AddExistingStorageForm: React.FC<AddExistingStorageFormProps> = ({
  selections,
  onClear,
  onUpdate,
}) => {
  const [projectSelectOpen, setProjectSelectOpen] = React.useState<boolean>(false);
  const [storageSelectOpen, setStorageSelectOpen] = React.useState<boolean>(false);

  return (
    <Form>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <FormGroup
            label="Project where the PV resides"
            fieldId="add-existing-storage-project-selection"
          >
            <Select
              variant="typeahead"
              selections={selections.project as string}
              isOpen={projectSelectOpen}
              onClear={() => {
                onClear(false);
                setProjectSelectOpen(false);
              }}
              onSelect={(e, selection) => {
                onUpdate(selection as string, false);
              }}
              onToggle={(isOpen) => setProjectSelectOpen(isOpen)}
              placeholderText="Select a project"
              menuAppendTo="parent"
            ></Select>
          </FormGroup>
        </FlexItem>
        <FlexItem>
          <FormGroup label="PV" fieldId="add-existing-storage-pv-selection">
            <Select
              variant="typeahead"
              selections={selections.storage as string}
              isOpen={storageSelectOpen}
              onClear={() => {
                onClear(true);
                setStorageSelectOpen(false);
              }}
              onSelect={(e, selection) => {
                onUpdate(selection as string, true);
              }}
              onToggle={(isOpen) => setStorageSelectOpen(isOpen)}
              placeholderText="Select a PV"
              menuAppendTo="parent"
            ></Select>
          </FormGroup>
        </FlexItem>
      </Flex>
    </Form>
  );
};

export default AddExistingStorageForm;
