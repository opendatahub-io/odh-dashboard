import * as React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { EnvVarConflict } from './envVarConflicts';

type Props = {
  conflicts: EnvVarConflict[];
};

const sourceTypeLabel: Record<string, string> = {
  'existing-secret': 'Existing secret',
  'inline-secret': 'Environment variable',
  connection: 'Connection',
};

const EnvVarConflictAlert: React.FC<Props> = ({ conflicts }) => {
  const [showConflicts, setShowConflicts] = React.useState(false);

  return (
    <Alert
      variant="warning"
      isInline
      title="Environment variable conflicts"
      data-testid="env-var-conflict-alert"
    >
      The following environment variable names are used by multiple sources. Resolve these conflicts
      before saving the workbench.
      <ExpandableSection
        toggleText="Show conflicts"
        onToggle={() => setShowConflicts((prev) => !prev)}
        isExpanded={showConflicts}
        isIndented
      >
        {conflicts.map((conflict) => (
          <div key={conflict.key} data-testid={`env-var-conflict-${conflict.key}`}>
            <b>{conflict.key}</b> is defined in:
            <List>
              {conflict.sources.map((source) => (
                <ListItem key={`${source.type}-${source.name}`}>
                  {source.name} ({sourceTypeLabel[source.type]})
                </ListItem>
              ))}
            </List>
          </div>
        ))}
      </ExpandableSection>
    </Alert>
  );
};

export default EnvVarConflictAlert;
