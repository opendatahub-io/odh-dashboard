import * as React from 'react';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '#~/pages/projects/types';

type EnvVarSource = {
  name: string;
  keys: string[];
};

const getSourcesFromEnvVariables = (envVariables: EnvVariable[]): EnvVarSource[] =>
  envVariables.reduce<EnvVarSource[]>((acc, envVar) => {
    if (envVar.type === EnvironmentVariableType.EXISTING_SECRET) {
      const refs = (envVar.existingSecretRefs ?? []).filter(
        (r) => r.secretName && r.selectedKeys.length > 0,
      );
      return [
        ...acc,
        ...refs.map((r) => ({
          name: `Secret "${r.secretName}"`,
          keys: r.selectedKeys.map((k) => r.keyAliases?.[k] ?? k),
        })),
      ];
    }
    if (
      envVar.values?.data &&
      envVar.values.data.length > 0 &&
      (envVar.values.category === SecretCategory.GENERIC ||
        envVar.values.category === SecretCategory.AWS ||
        envVar.values.category === SecretCategory.UPLOAD ||
        envVar.values.category === ConfigMapCategory.GENERIC ||
        envVar.values.category === ConfigMapCategory.UPLOAD)
    ) {
      const label = envVar.type === EnvironmentVariableType.CONFIG_MAP ? 'Config Map' : 'Secret';
      const sourceName = envVar.existingName ?? 'new';
      return [
        ...acc,
        {
          name: `${label} "${sourceName}"`,
          keys: envVar.values.data.map((d) => d.key).filter(Boolean),
        },
      ];
    }
    return acc;
  }, []);

const getSourcesFromConnections = (connections: Connection[]): EnvVarSource[] =>
  connections
    .filter((c) => c.data)
    .map((c) => ({
      name: `Connection "${
        c.metadata.annotations['openshift.io/display-name'] || c.metadata.name
      }"`,
      keys: Object.keys(c.data ?? {}),
    }));

type Conflict = {
  key: string;
  sources: string[];
};

export const findEnvVarConflicts = (
  envVariables: EnvVariable[],
  connections: Connection[],
): Conflict[] => {
  const allSources = [
    ...getSourcesFromEnvVariables(envVariables),
    ...getSourcesFromConnections(connections),
  ];

  const keyToSources = new Map<string, string[]>();
  for (const source of allSources) {
    for (const key of source.keys) {
      const sources = keyToSources.get(key) ?? [];
      sources.push(source.name);
      keyToSources.set(key, sources);
    }
  }

  return [...keyToSources.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([key, sources]) => ({ key, sources }));
};

type EnvVarConflictWarningProps = {
  envVariables: EnvVariable[];
  connections: Connection[];
};

const EnvVarConflictWarning: React.FC<EnvVarConflictWarningProps> = ({
  envVariables,
  connections,
}) => {
  const conflicts = React.useMemo(
    () => findEnvVarConflicts(envVariables, connections),
    [envVariables, connections],
  );
  const [expanded, setExpanded] = React.useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      isInline
      title="Environment variable name conflicts"
      data-testid="env-var-conflict-warning"
    >
      {conflicts.length === 1
        ? 'An environment variable name is used by multiple sources. Only the last value will take effect at runtime.'
        : `${conflicts.length} environment variable names are used by multiple sources. Only the last value for each will take effect at runtime.`}
      <ExpandableSection
        toggleText="Show conflicts"
        onToggle={() => setExpanded((prev) => !prev)}
        isExpanded={expanded}
        isIndented
      >
        <List>
          {conflicts.map((conflict) => (
            <ListItem key={conflict.key} data-testid={`env-conflict-${conflict.key}`}>
              <b>{conflict.key}</b> is defined in {conflict.sources.join(' and ')}
            </ListItem>
          ))}
        </List>
      </ExpandableSection>
    </Alert>
  );
};

export default EnvVarConflictWarning;
