import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import FieldGroupHelpLabelIcon from '~/components/FieldGroupHelpLabelIcon';

const ResourceNameDefinitionTooltip: React.FC = () => (
  <FieldGroupHelpLabelIcon
    content={
      <Stack hasGutter>
        <StackItem>Resource names are what your resources are labeled in OpenShift.</StackItem>
        <StackItem>Resource names are not editable after creation.</StackItem>
      </Stack>
    }
  />
);

export default ResourceNameDefinitionTooltip;
