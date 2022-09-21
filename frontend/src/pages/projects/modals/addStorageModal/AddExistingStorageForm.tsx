import * as React from 'react';
import { Select, Form, FormGroup, FlexItem, Flex } from '@patternfly/react-core';

type AddExistingStorageFormProps = {
  projectSelection: string | null;
  setProjectSelection: (project: string | null) => void;
  projectSelectOpen: boolean;
  setProjectSelectOpen: (open: boolean) => void;
  storageSelection: string | null;
  setStorageSelection: (storage: string | null) => void;
  storageSelectOpen: boolean;
  setStorageSelectOpen: (open: boolean) => void;
};

const AddExistingStorageForm: React.FC<AddExistingStorageFormProps> = ({
  projectSelection,
  setProjectSelection,
  projectSelectOpen,
  setProjectSelectOpen,
  storageSelection,
  setStorageSelection,
  storageSelectOpen,
  setStorageSelectOpen,
}) => {
  const clearProjectSelection = () => {
    setProjectSelectOpen(false);
    setProjectSelection(null);
    setStorageSelection(null);
  };

  const clearStorageSelection = () => {
    setStorageSelectOpen(false);
    setStorageSelection(null);
  };

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
              selections={projectSelection as string}
              isOpen={projectSelectOpen}
              onClear={clearProjectSelection}
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
              selections={storageSelection as string}
              isOpen={storageSelectOpen}
              onClear={clearStorageSelection}
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
