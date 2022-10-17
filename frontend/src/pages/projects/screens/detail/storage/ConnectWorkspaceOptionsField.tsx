import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { NotebookKind } from '../../../../../k8sTypes';
import { getNotebooks } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { getNotebookDisplayName } from '../../../utils';

type ConnectWorkspaceOptionsFieldProps = {
  fieldId: string;
  selection?: string;
  setSelection: (selection?: string) => void;
};

const ConnectWorkspaceOptionsField: React.FC<ConnectWorkspaceOptionsFieldProps> = ({
  fieldId,
  selection,
  setSelection,
}) => {
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = React.useState<boolean>(false);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allWorkspaces, setAllWorkspaces] = React.useState<NotebookKind[]>([]);

  React.useEffect(() => {
    getNotebooks(currentProject.metadata.name)
      .then((notebooks) => setAllWorkspaces(notebooks))
      .catch((e) => console.error('Error getting notebooks: ', e));
  }, [currentProject.metadata.name]);

  return (
    <FormGroup fieldId={fieldId}>
      <Select
        variant="typeahead"
        selections={selection}
        isOpen={workspaceSelectOpen}
        onClear={() => {
          setSelection(undefined);
          setWorkspaceSelectOpen(false);
        }}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            setSelection(selection);
            setWorkspaceSelectOpen(false);
          }
        }}
        onToggle={(isOpen) => setWorkspaceSelectOpen(isOpen)}
        placeholderText="Choose an existing workspace"
        menuAppendTo="parent"
      >
        {allWorkspaces.map((workspace) => (
          <SelectOption key={workspace.metadata.name} value={workspace.metadata.name}>
            {getNotebookDisplayName(workspace)}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default ConnectWorkspaceOptionsField;
