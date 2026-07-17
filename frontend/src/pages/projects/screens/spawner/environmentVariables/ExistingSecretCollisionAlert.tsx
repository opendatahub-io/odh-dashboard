import * as React from 'react';
import { Alert, Content, ContentVariants, Stack, StackItem } from '@patternfly/react-core';
import { EnvVarCollision } from './existingSecretConflicts';

type ExistingSecretCollisionAlertProps = {
  collisions: EnvVarCollision[];
};

const ExistingSecretCollisionAlert: React.FC<ExistingSecretCollisionAlertProps> = ({
  collisions,
}) => {
  if (collisions.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      isInline
      title="Key name collisions across attached secrets"
      data-testid="existing-secret-collision-alert"
    >
      <Stack hasGutter>
        {collisions.map((collision) => (
          <StackItem key={collision.keyName}>
            <Content component={ContentVariants.p}>
              <strong>{collision.keyName}</strong> is defined in{' '}
              {collision.sources.map((s) => s.name).join(' and ')}.
            </Content>
          </StackItem>
        ))}
        <StackItem>
          <Content component={ContentVariants.small}>
            Choose one and deselect the duplicate key to resolve the collision.
          </Content>
        </StackItem>
      </Stack>
    </Alert>
  );
};

export default ExistingSecretCollisionAlert;
