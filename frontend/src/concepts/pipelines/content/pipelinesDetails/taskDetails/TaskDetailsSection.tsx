import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';

type TaskDetailsSectionProps = {
  title: string;
  children: React.ReactNode;
};

const TaskDetailsSection: React.FC<TaskDetailsSectionProps> = ({ title, children }) => (
  <Stack hasGutter>
    <StackItem>
      <Title headingLevel="h3" size="lg">
        {title}
      </Title>
    </StackItem>
    <StackItem>{children}</StackItem>
  </Stack>
);

export default TaskDetailsSection;
