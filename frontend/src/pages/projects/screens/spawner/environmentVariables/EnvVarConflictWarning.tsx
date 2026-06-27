import React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './utils';

type Props = {
  conflicts: EnvVarConflict[];
};

export const EnvVarConflictWarning: React.FC<Props> = ({ conflicts }) => {
  const [showConflicts, setShowConflicts] = React.useState(false);

  return (
    <Alert
      variant="danger"
      isInline
      title="Environment variables conflict"
      data-testid="envvar-conflict-warning"
    >
      Environment variables from multiple sources conflict. When environment variables conflict,
      only one of the values is used in the workbench.
      <ExpandableSection
        toggleText={showConflicts ? 'Hide conflicts' : 'Show conflicts'}
        onToggle={() => setShowConflicts((prev) => !prev)}
        isExpanded={showConflicts}
        isIndented
      >
        {conflicts.map((conflict, conflictIndex) => (
          <div key={conflictIndex} data-testid={`envvar-conflict-${conflictIndex}`}>
            <b>{conflict.source1}</b> and <b>{conflict.source2}</b> contain the following
            conflicting variables:
            <List>
              {conflict.keys.map((key, keyIndex) => (
                <ListItem key={keyIndex}>
                  <b>{key}</b>
                </ListItem>
              ))}
            </List>
            <br />
          </div>
        ))}
      </ExpandableSection>
    </Alert>
  );
};
