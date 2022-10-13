import * as React from 'react';
import { Checkbox, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { NotebookKind } from '../../../../../k8sTypes';

type ConnectWorkspaceOptionsFieldProps = {
  fieldId: string;
  allWorkspaces: NotebookKind[];
  setSelections: (selections: string[]) => void;
};

const ConnectWorkspaceOptionsField: React.FC<ConnectWorkspaceOptionsFieldProps> = ({
  fieldId,
  allWorkspaces,
  setSelections,
}) => {
  const [isConnectToAll, setConnectToAll] = React.useState<boolean>(false);
  return (
    <FormGroup role="radiogroup" fieldId={fieldId}>
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            id="connect-to-current-workspace-checkbox"
            name="connect-to-current-workspace-checkbox"
            label="Connect to this workspace"
            isChecked
            isDisabled
          />
        </StackItem>
        <StackItem>
          <Checkbox
            id="connect-to-all-workspaces-checkbox"
            name="connect-to-all-workspaces-checkbox"
            label="Connect to all workspaces"
            isChecked={isConnectToAll}
            isDisabled
            onChange={(checked) => {
              setConnectToAll(checked);
              setSelections(
                checked ? allWorkspaces.map((workspace) => workspace.metadata.name) : [],
              );
            }}
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default ConnectWorkspaceOptionsField;
