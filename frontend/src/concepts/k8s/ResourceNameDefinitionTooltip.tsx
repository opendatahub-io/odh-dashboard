import * as React from 'react';
import { Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

const ResourceNameDefinitionTooltip: React.FC = () => (
  <Tooltip
    position="right"
    content={
      <Stack hasGutter>
        <StackItem>Resource names are what your resources are labeled in OpenShift.</StackItem>
        <StackItem>Resource names are not editable after creation.</StackItem>
      </Stack>
    }
  >
    <HelpIcon aria-label="More info" />
  </Tooltip>
);

export default ResourceNameDefinitionTooltip;
