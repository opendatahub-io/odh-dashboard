import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';
import { NotebookKind } from '../../../k8sTypes';

type SelectNotebookFieldProps = {
  loaded: boolean;
  notebooks: NotebookKind[];
  isRequired?: boolean;
  isDisabled?: boolean;
  selectionHelperText?: string;
  placeholder?: string;
  /* Selections will be considered always an array -- but will only be of 1 item when you don't set isMultiSelect */
  selections: string[];
  onSelect: (selection: string[]) => void;
  isMultiSelect?: boolean;
};

const ConnectedNotebookField: React.FC<SelectNotebookFieldProps> = ({
  loaded,
  notebooks,
  isRequired,
  selections,
  onSelect,
  isDisabled,
  selectionHelperText,
  isMultiSelect,
  placeholder = 'Select a workbench to connect',
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
    placeholderText = placeholder;
  }

  return (
    <FormGroup
      label="Connected workbench"
      helperText={!noNotebooks && selectionHelperText}
      fieldId="connect-existing-workbench"
      isRequired={isRequired}
    >
      <Select
        removeFindDomNode
        variant={isMultiSelect ? 'typeaheadmulti' : 'typeahead'}
        selections={selections}
        isOpen={notebookSelectOpen}
        isDisabled={disabled}
        onClear={() => {
          onSelect([]);
          setNotebookSelectOpen(false);
        }}
        onSelect={(e, selection) => {
          if (typeof selection !== 'string') {
            return;
          }

          if (selections.includes(selection)) {
            onSelect(selections.filter((f) => f !== selection));
          } else if (isMultiSelect) {
            onSelect([...selections, selection]);
          } else {
            onSelect([selection]);
          }
          setNotebookSelectOpen(false);
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

export default ConnectedNotebookField;
