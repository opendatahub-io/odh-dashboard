import * as React from 'react';
import { Radio, Select, Stack, StackItem } from '@patternfly/react-core';

type ConnectWorkbenchOptionsProps = {
  allWorkbenches: string[]; // maybe workbench type in the future, take string now
  selections: string[];
  setSelections: (selections: string[]) => void;
};

const ConnectWorkbenchOptions: React.FC<ConnectWorkbenchOptionsProps> = ({
  allWorkbenches,
  selections,
  setSelections,
}) => {
  const [workbenchSelectOpen, setWorkbenchSelectOpen] = React.useState<boolean>(false);
  const [isConnectToAll, setConnectToAll] = React.useState<boolean>(true);
  return (
    <Stack hasGutter>
      <StackItem>
        <Radio
          id="connect-to-all-workbenches-radio"
          name="connect-to-all-workbenches-radio"
          label="Connect to all workbenches"
          isChecked={isConnectToAll}
          onChange={() => {
            setConnectToAll(true);
            setSelections(allWorkbenches);
          }}
        />
      </StackItem>
      <StackItem>
        <Radio
          className="radio-fix-body-width"
          id="connect-to-specific-workbench-radio"
          name="connect-to-specific-workbench-radio"
          label="Connect to a specific workbench"
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
                isOpen={workbenchSelectOpen}
                onClear={() => {
                  setSelections([]);
                  setWorkbenchSelectOpen(false);
                }}
                onSelect={(e, selection) => {
                  if (typeof selection === 'string') {
                    setSelections([selection]);
                    setWorkbenchSelectOpen(false);
                  }
                }}
                onToggle={(isOpen) => setWorkbenchSelectOpen(isOpen)}
                placeholderText="Choose an existing workbench"
                menuAppendTo="parent"
              />
            )
          }
        />
      </StackItem>
    </Stack>
  );
};

export default ConnectWorkbenchOptions;
