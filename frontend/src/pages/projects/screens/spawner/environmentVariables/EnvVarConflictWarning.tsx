import React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './envVarConflicts';

type EnvVarConflictWarningProps = {
  conflicts: EnvVarConflict[];
};

const EnvVarConflictWarning: React.FC<EnvVarConflictWarningProps> = ({ conflicts }) => (
  <Alert
    variant="warning"
    isInline
    title="Environment variable conflicts"
    data-testid="env-var-conflict-warning"
  >
    Environment variables from different sources have conflicting names. When names conflict, only
    one of the values is used in the workbench.
    <ExpandableSection toggleText="Show conflicts" isIndented>
      <List>
        {conflicts.map((conflict) => (
          <ListItem key={conflict.key}>
            <strong>{conflict.key}</strong> is defined in {conflict.sources.join(' and ')}
          </ListItem>
        ))}
      </List>
    </ExpandableSection>
  </Alert>
);

export default EnvVarConflictWarning;
