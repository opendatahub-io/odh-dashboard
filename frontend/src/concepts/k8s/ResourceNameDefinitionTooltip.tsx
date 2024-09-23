import * as React from 'react';
import { Popover, Stack, StackItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

const ResourceNameDefinitionTooltip: React.FC = () => (
  <Popover
    bodyContent={
      <Stack hasGutter>
        <StackItem>Resource names are what your resources are labeled in OpenShift.</StackItem>
        <StackItem>Resource names are not editable after creation.</StackItem>
      </Stack>
    }
  >
    <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
  </Popover>
);

export default ResourceNameDefinitionTooltip;
