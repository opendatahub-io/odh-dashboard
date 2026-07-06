import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';

type TaskDetailsSectionProps = {
  title: string;
  children: React.ReactNode;
  testId?: string;
};

const TaskDetailsSection: React.FC<TaskDetailsSectionProps> = ({ title, children, testId }) => (
  <Stack hasGutter data-testid={testId}>
    <StackItem>
      <Title headingLevel="h3" size="lg">
        {title}
      </Title>
    </StackItem>
    <StackItem>{children}</StackItem>
  </Stack>
);

export default TaskDetailsSection;
