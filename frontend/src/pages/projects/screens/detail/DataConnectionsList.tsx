import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';

const DataConnectionsList: React.FC = () => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id="data-connections" headingLevel="h4" size="xl">
              Data connections
            </Title>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary">Add data connection</Button>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <EmptyDetailsList
          title="No data connections"
          description="To get started, add data to your project."
        />
      </StackItem>
    </Stack>
  );
};

export default DataConnectionsList;
