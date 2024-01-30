import React from 'react';
import { Checkbox, Popover, Icon, Split, SplitItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
type ToggleResourceNameProps = {
  showHiddenResourceName: boolean | undefined;
  setShowHiddenResourceName: (checked: boolean) => void;
};
const ToggleResourceName: React.FC<ToggleResourceNameProps> = ({
  showHiddenResourceName,
  setShowHiddenResourceName,
}) => (
  <Split hasGutter>
    <SplitItem>
      <Checkbox
        label="Show advanced settings"
        isChecked={showHiddenResourceName}
        id="toggleResourceName"
        name="toggleResourceName"
        onChange={() => setShowHiddenResourceName(!showHiddenResourceName)}
        aria-label="Show advanced settings"
        role="checkbox"
      />
    </SplitItem>
    <SplitItem>
      <Popover
        aria-label="Show advanced settings"
        headerContent={<div>Show advanced settings</div>}
        bodyContent={
          <div>
            It contains some advanced settings that operate less frequently and are related to
            names.
          </div>
        }
      >
        <Icon aria-label="Show advanced settings info" role="button">
          <OutlinedQuestionCircleIcon />
        </Icon>
      </Popover>
    </SplitItem>
  </Split>
);

export default ToggleResourceName;
