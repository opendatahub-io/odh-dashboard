import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../../../utils';
import useProjectNotebooks from '../../../notebook/useProjectNotebooks';
import { getNotebookMountPaths } from '../../../notebook/utils';
import { ForNotebookSelection } from '../../../types';
import MountPathField from '../../../pvc/MountPathField';

type ConnectExistingWorkspaceProps = {
  forNotebookData: ForNotebookSelection;
  setForNotebookData: (value: ForNotebookSelection) => void;
};

const ConnectExistingWorkspace: React.FC<ConnectExistingWorkspaceProps> = ({
  forNotebookData,
  setForNotebookData,
}) => {
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = React.useState<boolean>(false);
  const [notebooks, loaded, error] = useProjectNotebooks();

  if (error) {
    return (
      <Alert variant="danger" isInline title="Unable to fetch notebooks">
        {error.message}
      </Alert>
    );
  }

  const noNotebooks = notebooks.length === 0;
  const isDisabled = !loaded || noNotebooks;

  let placeholderText: string;
  if (!loaded) {
    placeholderText = 'Fetching workspaces...';
  } else if (noNotebooks) {
    placeholderText = 'No available workspaces';
  } else {
    placeholderText = 'Choose an existing workspace';
  }

  const inUseMountPaths = getNotebookMountPaths(
    notebooks.find((notebook) => notebook.metadata.name === forNotebookData.name),
  );

  return (
    <>
      <FormGroup
        label="Workspace"
        helperText={!noNotebooks && 'Optionally connect it to an existing workspace'}
        fieldId="connect-existing-workspace"
      >
        <Select
          variant="typeahead"
          selections={forNotebookData.name}
          isOpen={workspaceSelectOpen}
          isDisabled={isDisabled}
          onClear={() => {
            setForNotebookData({ name: '', mountPath: { value: '', error: '' } });
            setWorkspaceSelectOpen(false);
          }}
          onSelect={(e, selection) => {
            if (typeof selection === 'string') {
              setForNotebookData({
                name: selection,
                mountPath: { value: '', error: '' },
              });
              setWorkspaceSelectOpen(false);
            }
          }}
          onToggle={(isOpen) => setWorkspaceSelectOpen(isOpen)}
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
      {forNotebookData.name && (
        <MountPathField
          inUseMountPaths={inUseMountPaths}
          mountPath={forNotebookData.mountPath}
          setMountPath={(mountPath) => {
            setForNotebookData({ ...forNotebookData, mountPath });
          }}
        />
      )}
    </>
  );
};

export default ConnectExistingWorkspace;
