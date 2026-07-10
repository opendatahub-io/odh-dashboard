import * as React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './envVarConflicts';

type EnvVarConflictAlertProps = {
  conflicts: EnvVarConflict[];
};

export const EnvVarConflictAlert: React.FC<EnvVarConflictAlertProps> = ({ conflicts }) => {
  const [showConflicts, setShowConflicts] = React.useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      isInline
      title="Environment variable conflicts"
      data-testid="env-var-conflict-alert"
    >
      Environment variables from different sources are conflicting. When environment variables
      conflict, only one of the values will be used in the workbench.
      <ExpandableSection
        toggleText={showConflicts ? 'Hide conflicts' : 'Show conflicts'}
        onToggle={(_event, isExpanded) => setShowConflicts(isExpanded)}
        isExpanded={showConflicts}
        isIndented
      >
        {conflicts.map((conflict, conflictIndex) => (
          <div key={conflict.key} data-testid={`env-var-conflict-${conflictIndex}`}>
            <b>{conflict.key}</b> is defined in:
            <List>
              {conflict.sources.map((source, sourceIndex) => (
                <ListItem key={sourceIndex}>{source}</ListItem>
              ))}
            </List>
            {conflictIndex < conflicts.length - 1 && <br />}
          </div>
        ))}
      </ExpandableSection>
    </Alert>
  );
};
