import React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './envVarConflicts';

type EnvVarConflictWarningProps = {
  conflicts: EnvVarConflict[];
};

const EnvVarConflictWarning: React.FC<EnvVarConflictWarningProps> = ({ conflicts }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      isInline
      title="Environment variable conflicts"
      data-testid="env-var-conflict-warning"
    >
      Environment variables with the same key are defined in multiple sources. When variables
      conflict, only one of the values will be used in the workbench.
      <ExpandableSection
        toggleText="Show conflicts"
        onToggle={() => setIsExpanded((prev) => !prev)}
        isExpanded={isExpanded}
        isIndented
      >
        <List>
          {conflicts.map((conflict) => (
            <ListItem key={conflict.key} data-testid={`env-var-conflict-${conflict.key}`}>
              <b>{conflict.key}</b> is defined in: {conflict.sources.join(', ')}
            </ListItem>
          ))}
        </List>
      </ExpandableSection>
    </Alert>
  );
};

export default EnvVarConflictWarning;
