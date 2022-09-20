import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';

const WorkspacesList: React.FC = () => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id="data-science-workspaces" headingLevel="h4" size="xl">
              Data science workspaces
            </Title>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary">Create data science workspace</Button>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <EmptyDetailsList
          title="No data science workspaces"
          description="To get started, create a data science workspace."
        />
      </StackItem>
    </Stack>
  );
};

export default WorkspacesList;
