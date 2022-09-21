import * as React from 'react';
import { Flex, FlexItem, Radio, Select } from '@patternfly/react-core';

type ConnectWorkbenchOptionsProps = {
  isConnectToAll: boolean;
  setConnectToAll: (connectToAll: boolean) => void;
  workbenchSelection: string | null;
  setWorkbenchSelection: (selection: string | null) => void;
  workbenchSelectOpen: boolean;
  setWorkbenchSelectOpen: (open: boolean) => void;
};

const ConnectWorkbenchOptions: React.FC<ConnectWorkbenchOptionsProps> = ({
  isConnectToAll,
  setConnectToAll,
  workbenchSelection,
  setWorkbenchSelection,
  workbenchSelectOpen,
  setWorkbenchSelectOpen,
}) => {
  const clearWorkbenchSelection = () => {
    setWorkbenchSelectOpen(false);
    setWorkbenchSelection(null);
  };
  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Radio
          id="connect-to-all-workbenches-radio"
          name="connect-to-all-workbenches-radio"
          label="Connect to all workbenches"
          isChecked={isConnectToAll}
          onChange={() => setConnectToAll(true)}
        />
      </FlexItem>
      <FlexItem>
        <Radio
          className="radio-fix-body-width"
          id="connect-to-specific-workbench-radio"
          name="connect-to-specific-workbench-radio"
          label="Connect to a specific workbench"
          isChecked={!isConnectToAll}
          onChange={() => setConnectToAll(false)}
          body={
            !isConnectToAll && (
              <Select
                variant="typeahead"
                selections={workbenchSelection as string}
                isOpen={workbenchSelectOpen}
                onClear={clearWorkbenchSelection}
                onToggle={(isOpen) => setWorkbenchSelectOpen(isOpen)}
                placeholderText="Choose an existing workbench"
                menuAppendTo="parent"
              ></Select>
            )
          }
        />
      </FlexItem>
    </Flex>
  );
};

export default ConnectWorkbenchOptions;
