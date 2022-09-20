import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';

const ModelServingList: React.FC = () => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id="model-serving" headingLevel="h4" size="xl">
              Model serving
            </Title>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary">Serve a model</Button>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <EmptyDetailsList
          title="No models served"
          description="To serve a model, first add a workspace that includes a model."
        />
      </StackItem>
    </Stack>
  );
};

export default ModelServingList;
