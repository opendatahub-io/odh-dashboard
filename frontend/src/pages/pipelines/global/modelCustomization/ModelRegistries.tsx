import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';

export const ModelRegistries: React.FC = () => {
  const [modelRegistries] = React.useState<string[]>([]);

  return (
    <Stack hasGutter>
      <StackItem>Model registries with OCI storage that you have access to:</StackItem>
      {modelRegistries.length === 0 && (
        <StackItem>
          You do not have access to any model registries with OCI storage. Please contact your
          administrator.
        </StackItem>
      )}
      {modelRegistries.length > 0 &&
        modelRegistries.map((registry) => <StackItem key={registry}>{registry}</StackItem>)}
    </Stack>
  );
};
