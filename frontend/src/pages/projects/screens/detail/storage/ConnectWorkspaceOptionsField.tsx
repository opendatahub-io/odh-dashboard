import * as React from 'react';
import { FormGroup, Radio, Select, Stack, StackItem } from '@patternfly/react-core';
import { NotebookKind } from '../../../../../k8sTypes';

type ConnectWorkspaceOptionsFieldProps = {
  fieldId: string;
  allWorkspaces: NotebookKind[];
  selections: string[];
  setSelections: (selections: string[]) => void;
};

const ConnectWorkspaceOptionsField: React.FC<ConnectWorkspaceOptionsFieldProps> = ({
  fieldId,
  allWorkspaces,
  selections,
  setSelections,
}) => {
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = React.useState<boolean>(false);
  const [isConnectToAll, setConnectToAll] = React.useState<boolean>(true);
  return (
    <FormGroup role="radiogroup" fieldId={fieldId}>
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="connect-to-all-workspaces-radio"
            name="connect-to-all-workspaces-radio"
            label="Connect to all workspaces"
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
                />
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default ConnectWorkspaceOptionsField;
