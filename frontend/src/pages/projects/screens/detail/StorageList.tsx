import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';

const StorageList: React.FC = () => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id="storage" headingLevel="h4" size="xl">
              Storage
            </Title>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary">Add storage</Button>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <EmptyDetailsList
          title="No storage"
          description="Choose existing, or add new on cluster storage."
        />
      </StackItem>
    </Stack>
  );
};

export default StorageList;
