import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

type TaskDetailsPrintKeyValuesProps = {
  items: { label: string; value: React.ReactNode }[];
};

const TaskDetailsPrintKeyValues: React.FC<TaskDetailsPrintKeyValuesProps> = ({ items }) => (
  <DescriptionList
    isHorizontal
    isCompact
    horizontalTermWidthModifier={{
      default: '16ch',
    }}
  >
    {items.map((result, i) => (
      <DescriptionListGroup style={{ alignItems: 'start' }} key={`item-${i}`}>
        <DescriptionListTerm>{result.label}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${result.label}-item`}>
          {result.value}
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

export default TaskDetailsPrintKeyValues;
