import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';
import { NotebookKind } from '../../../k8sTypes';

type SelectNotebookFieldProps = {
  loaded: boolean;
  notebooks: NotebookKind[];
  selection: string;
  onSelect: (selection?: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  selectionHelperText?: string;
  label?: string;
};

const SelectNotebookField: React.FC<SelectNotebookFieldProps> = ({
  loaded,
  notebooks,
  isRequired,
  selection,
  onSelect,
  isDisabled,
  selectionHelperText,
  label = 'Workbench',
}) => {
  const [notebookSelectOpen, setNotebookSelectOpen] = React.useState<boolean>(false);

  const noNotebooks = notebooks.length === 0;
  const disabled = !!isDisabled || !loaded || noNotebooks;

  let placeholderText: string;
  if (!loaded) {
    placeholderText = 'Fetching workbenches...';
  } else if (noNotebooks) {
    placeholderText = 'No available workbenches';
  } else {
    placeholderText = 'Choose an existing workbench';
  }

  return (
    <FormGroup
      label={label}
      helperText={!noNotebooks && selectionHelperText}
      fieldId="connect-existing-workbench"
      isRequired={isRequired}
    >
      <Select
        removeFindDomNode
        variant="typeahead"
        selections={selection}
        isOpen={notebookSelectOpen}
        isDisabled={disabled}
        onClear={() => {
          onSelect();
          setNotebookSelectOpen(false);
        }}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            onSelect(selection);
            setNotebookSelectOpen(false);
          }
        }}
        onToggle={(isOpen) => setNotebookSelectOpen(isOpen)}
        placeholderText={placeholderText}
        menuAppendTo="parent"
      >
        {notebooks.map((notebook) => (
          <SelectOption key={notebook.metadata.name} value={notebook.metadata.name}>
            {getNotebookDisplayName(notebook)}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default SelectNotebookField;
