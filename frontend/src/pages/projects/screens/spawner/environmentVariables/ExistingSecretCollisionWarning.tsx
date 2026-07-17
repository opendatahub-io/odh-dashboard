import * as React from 'react';
import { Alert, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './existingSecretUtils';

type ExistingSecretCollisionWarningProps = {
  conflicts: EnvVarConflict[];
};

const ExistingSecretCollisionWarning: React.FC<ExistingSecretCollisionWarningProps> = ({
  conflicts,
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      isInline
      title="Key name collisions across attached secrets"
      data-testid="existing-secret-collision-warning"
    >
      <List>
        {conflicts.map((conflict) => (
          <ListItem key={conflict.key}>
            <strong>{conflict.key}</strong> is defined in{' '}
            {conflict.sources.map((s) => s.name).join(' and ')}.
          </ListItem>
        ))}
      </List>
      Choose one and deselect the duplicate key to resolve the collision.
    </Alert>
  );
};

export default ExistingSecretCollisionWarning;
