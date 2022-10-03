import * as React from 'react';
import { Select, Form, FormGroup } from '@patternfly/react-core';
import { ExistingStorage } from './types';

type AddExistingStorageFormProps = {
  selections: ExistingStorage;
  setSelections: (selections: ExistingStorage) => void;
};

const AddExistingStorageForm: React.FC<AddExistingStorageFormProps> = ({
  selections,
  setSelections,
}) => {
  const [projectSelectOpen, setProjectSelectOpen] = React.useState<boolean>(false);
  const [storageSelectOpen, setStorageSelectOpen] = React.useState<boolean>(false);

  return (
    <Form>
      <FormGroup
        label="Project where the PV resides"
        fieldId="add-existing-storage-project-selection"
      >
        <Select
          variant="typeahead"
          selections={selections.project}
          isOpen={projectSelectOpen}
          onClear={() => {
            setSelections({
              project: undefined,
              storage: undefined,
            });
            setProjectSelectOpen(false);
          }}
          onSelect={(e, selection) => {
            if (typeof selection === 'string') {
              setSelections({
                project: selection,
                storage: undefined,
              });
            }
          }}
          onToggle={(isOpen) => setProjectSelectOpen(isOpen)}
          placeholderText="Select a project"
          menuAppendTo="parent"
        />
      </FormGroup>
      <FormGroup label="PV" fieldId="add-existing-storage-pv-selection">
        <Select
          variant="typeahead"
          selections={selections.storage}
          isOpen={storageSelectOpen}
          onClear={() => {
            setSelections({
              ...selections,
              storage: undefined,
            });
            setStorageSelectOpen(false);
          }}
          onSelect={(e, selection) => {
            if (typeof selection === 'string') {
              setSelections({
                ...selections,
                storage: selection,
              });
            }
          }}
          onToggle={(isOpen) => setStorageSelectOpen(isOpen)}
          placeholderText="Select a PV"
          menuAppendTo="parent"
        />
      </FormGroup>
    </Form>
  );
};

export default AddExistingStorageForm;
