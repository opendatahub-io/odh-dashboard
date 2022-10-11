import * as React from 'react';
import { Checkbox, FormGroup, Stack, StackItem } from '@patternfly/react-core';

type ConnectWorkspaceOptionsFieldProps = {
  fieldId: string;
  allWorkspaces: string[]; // maybe workspace type in the future, take string now
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
            isDisabled // disabled it for now
            onChange={(checked) => {
              setConnectToAll(checked);
              setSelections(checked ? allWorkspaces : []); // here we use [] to represent the current workspace so we don't need to pass it in here
            }}
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default ConnectWorkspaceOptionsField;
