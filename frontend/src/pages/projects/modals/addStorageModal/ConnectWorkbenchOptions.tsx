import * as React from 'react';
import { Flex, FlexItem, Radio, Select } from '@patternfly/react-core';

type ConnectWorkbenchOptionsProps = {
  allWorkbenches: string[]; // maybe workbench type in the future, take string now
  workbenchSelection: string | string[] | null;
  onUpdate: (workbench: string | string[] | null) => void;
};

const ConnectWorkbenchOptions: React.FC<ConnectWorkbenchOptionsProps> = ({
  allWorkbenches,
  workbenchSelection,
  onUpdate,
}) => {
  const [workbenchSelectOpen, setWorkbenchSelectOpen] = React.useState<boolean>(false);
  const isConnectToAll = Array.isArray(workbenchSelection);
  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Radio
          id="connect-to-all-workbenches-radio"
          name="connect-to-all-workbenches-radio"
          label="Connect to all workbenches"
          isChecked={isConnectToAll}
          onChange={() => onUpdate(allWorkbenches)}
        />
      </FlexItem>
      <FlexItem>
        <Radio
          className="radio-fix-body-width"
          id="connect-to-specific-workbench-radio"
          name="connect-to-specific-workbench-radio"
          label="Connect to a specific workbench"
          isChecked={!isConnectToAll}
          onChange={() => onUpdate(null)}
          body={
            !isConnectToAll && (
              <Select
                variant="typeahead"
                selections={workbenchSelection as string}
                isOpen={workbenchSelectOpen}
                onClear={() => {
                  onUpdate(null);
                  setWorkbenchSelectOpen(false);
                }}
                onSelect={(e, selection) => {
                  onUpdate(selection as string);
                  setWorkbenchSelectOpen(false);
                }}
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
