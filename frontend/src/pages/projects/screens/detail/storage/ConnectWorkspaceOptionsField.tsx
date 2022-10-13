import * as React from 'react';
import { FormGroup, Radio, Select, SelectOption, Stack, StackItem } from '@patternfly/react-core';
import { NotebookKind } from '../../../../../k8sTypes';
import { getNotebooks } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { getNotebookDisplayName } from '../../../utils';

type ConnectWorkspaceOptionsFieldProps = {
  fieldId: string;
  selections: string[];
  setSelections: (selections: string[]) => void;
};

const ConnectWorkspaceOptionsField: React.FC<ConnectWorkspaceOptionsFieldProps> = ({
  fieldId,
  selections,
  setSelections,
}) => {
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = React.useState<boolean>(false);
  const [isConnectToAll, setConnectToAll] = React.useState<boolean>(false);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allWorkspaces, setAllWorkspaces] = React.useState<NotebookKind[]>([]);

  React.useEffect(() => {
    getNotebooks(currentProject.metadata.name)
      .then((notebooks) => setAllWorkspaces(notebooks))
      .catch((e) => console.error('Error getting notebooks: ', e));
  }, [currentProject.metadata.name]);

  const options = React.useMemo(
    () =>
      allWorkspaces.map((workspace) => (
        <SelectOption key={workspace.metadata.name} value={workspace.metadata.name}>
          {getNotebookDisplayName(workspace)}
        </SelectOption>
      )),
    [allWorkspaces],
  );

  return (
    <FormGroup role="radiogroup" fieldId={fieldId}>
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="connect-to-all-workspaces-radio"
            name="connect-to-all-workspaces-radio"
            label="Connect to all workspaces"
            isDisabled
            isChecked={isConnectToAll}
            onChange={() => {
              setConnectToAll(true);
              setSelections(allWorkspaces.map((workspace) => workspace.metadata.name));
            }}
          />
        </StackItem>
        <StackItem>
          <Radio
            className="checkbox-radio-fix-body-width"
            id="connect-to-specific-workspace-radio"
            name="connect-to-specific-workspace-radio"
            label="Connect to a specific workspace"
            isChecked={!isConnectToAll}
            onChange={() => {
              setConnectToAll(false);
              setSelections([]);
            }}
            body={
              !isConnectToAll && (
                <Select
                  variant="typeahead"
                  selections={selections}
                  isOpen={workspaceSelectOpen}
                  onClear={() => {
                    setSelections([]);
                    setWorkspaceSelectOpen(false);
                  }}
                  onSelect={(e, selection) => {
                    if (typeof selection === 'string') {
                      setSelections([selection]);
                      setWorkspaceSelectOpen(false);
                    }
                  }}
                  onToggle={(isOpen) => setWorkspaceSelectOpen(isOpen)}
                  placeholderText="Choose an existing workspace"
                  menuAppendTo="parent"
                >
                  {options}
                </Select>
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default ConnectWorkspaceOptionsField;
