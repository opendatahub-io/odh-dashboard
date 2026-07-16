import * as React from 'react';
import { Alert, List, ListItem } from '@patternfly/react-core';
import type { EnvKeyCollision } from './existingSecretUtils';

type ExistingSecretCollisionAlertProps = {
  collisions: EnvKeyCollision[];
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
      <List>
        {collisions.map((collision) => (
          <ListItem key={collision.key}>
            <strong>{collision.key}</strong> is defined in:{' '}
            {collision.sources
              .map((source) => `${source.name} (${source.type.replaceAll('-', ' ')})`)
              .join(', ')}
          </ListItem>
        ))}
      </List>
      Choose one and deselect the duplicate key to resolve the collision.
    </Alert>
  );
};

export default ExistingSecretCollisionAlert;
