import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { NotebookKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { MultiSelection } from '#~/components/MultiSelection';
import TypeaheadSelect from '#~/components/TypeaheadSelect';

type SelectNotebookFieldProps = {
  loaded: boolean;
  notebooks: NotebookKind[];
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
  selections,
  onSelect,
  isDisabled,
  selectionHelperText,
  isMultiSelect,
  placeholder = 'Select a workbench to connect',
}) => {
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

  const options = React.useMemo(
    () =>
      notebooks.map((notebook) => ({
        value: notebook.metadata.name,
        content: getDisplayNameFromK8sResource(notebook),
      })),
    [notebooks],
  );

  return (
    <FormGroup
      label="Connected workbench"
      fieldId="connect-existing-workbench"
      data-testid="connect-existing-workbench-group"
    >
      {isMultiSelect ? (
        <MultiSelection
          id="connected-notebook-select"
          isDisabled={disabled}
          ariaLabel="Notebook select"
          value={notebooks.map((notebook) => ({
            id: notebook.metadata.name,
            name: getDisplayNameFromK8sResource(notebook),
            selected: selections.includes(notebook.metadata.name),
          }))}
          setValue={(newState) =>
            onSelect(newState.filter((n) => n.selected).map((n) => String(n.id)))
          }
        />
      ) : (
        <TypeaheadSelect
          id="connected-notebook-select"
          isDisabled={disabled}
          selectOptions={options}
          selected={selections[0]}
          onClearSelection={() => onSelect([])}
          onSelect={(_ev, value) => {
            if (typeof value === 'string') {
              const notebook = notebooks.find((n) => n.metadata.name === value);
              if (notebook) {
                onSelect([value]);
              }
            }
          }}
          placeholder={placeholderText}
          noOptionsFoundMessage="Search for a workbench name"
          toggleProps={{
            id: 'notebook-search-input',
          }}
          data-testid="notebook-search-select"
          isRequired={false}
        />
      )}
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{!noNotebooks && selectionHelperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ConnectedNotebookField;
