import React from 'react';
import { Alert, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflictDetection';

type ExistingSecretConflictWarningProps = {
  conflicts: EnvVarConflict[];
};

const formatSources = (sources: string[]): string => {
  if (sources.length === 0) {
    return '';
  }
  if (sources.length === 1) {
    return sources[0];
  }
  if (sources.length === 2) {
    return `${sources[0]} and ${sources[1]}`;
  }
  return `${sources.slice(0, -1).join(', ')}, and ${sources[sources.length - 1]}`;
};

const ExistingSecretConflictWarning: React.FC<ExistingSecretConflictWarningProps> = ({
  conflicts,
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="danger"
      isInline
      title="Environment variable conflicts"
      data-testid="existing-secret-conflict-warning"
    >
      <List>
        {conflicts.map((conflict, index) => (
          <ListItem key={conflict.key} data-testid={`conflict-item-${index}`}>
            The environment variable &apos;{conflict.key}&apos; is already used by{' '}
            {formatSources(conflict.sources)}
          </ListItem>
        ))}
      </List>
    </Alert>
  );
};

export default ExistingSecretConflictWarning;
