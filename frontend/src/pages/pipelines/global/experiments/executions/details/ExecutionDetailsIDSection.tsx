import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { Execution } from '#~/third_party/mlmd';

type ExecutionDetailsIDSectionProps = {
  execution: Execution;
};

const ExecutionDetailsIDSection: React.FC<ExecutionDetailsIDSectionProps> = ({ execution }) => (
  <DescriptionList isHorizontal isCompact>
    <DescriptionListGroup>
      <DescriptionListTerm>ID</DescriptionListTerm>
      <DescriptionListDescription>{execution.getId()}</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Type</DescriptionListTerm>
      <DescriptionListDescription>{execution.getType()}</DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

export default ExecutionDetailsIDSection;
