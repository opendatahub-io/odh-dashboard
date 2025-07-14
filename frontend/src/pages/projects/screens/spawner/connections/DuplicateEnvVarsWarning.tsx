import React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { Connection } from '#~/concepts/connectionTypes/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

type Conflict = {
  firstConnection: string;
  secondConnection: string;
  vars: string[];
};

export const connectionEnvVarConflicts = (connections: Connection[]): Conflict[] => {
  const conflicts: Conflict[] = [];
  for (const first of connections) {
    for (const second of connections) {
      if (first.metadata.name === second.metadata.name) {
        break;
      }
      if (!first.data || !second.data) {
        continue;
      }
      const envVars = [...Object.keys(first.data), ...Object.keys(second.data)];
      const duplicates = envVars.filter((e, i) => envVars.indexOf(e) !== i);
      if (duplicates.length > 0) {
        conflicts.push({
          firstConnection: getDisplayNameFromK8sResource(first),
          secondConnection: getDisplayNameFromK8sResource(second),
          vars: duplicates,
        });
      }
    }
  }
  return conflicts;
};

type Props = {
  envVarConflicts: Conflict[];
};

export const DuplicateEnvVarWarning: React.FC<Props> = ({ envVarConflicts }) => {
  const [showConflicts, setShowConflicts] = React.useState(false);

  return (
    <Alert variant="warning" isInline title="Connections conflict">
      Two or more connections contain conflicting environment variables. When environment variables
      conflict, only one of the values is used in the workbench.
      <ExpandableSection
        toggleText={showConflicts ? 'Show conflicts' : 'Show conflicts'}
        onToggle={() => setShowConflicts((prev) => !prev)}
        isExpanded={showConflicts}
        isIndented
      >
        {envVarConflicts.map((conflict, conflictIndex) => (
          <div key={conflictIndex} data-testid={`envvar-conflict-${conflictIndex}`}>
            <b>{conflict.firstConnection}</b> and <b>{conflict.secondConnection}</b> contain the
            following conflicting variables:
            <List>
              {conflict.vars.map((value, valueIndex) => (
                <ListItem key={valueIndex}>
                  <b>{value}</b>
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
