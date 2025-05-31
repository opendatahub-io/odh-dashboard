import { Connection } from '#~/concepts/connectionTypes/types';
import { NotebookKind } from '#~/k8sTypes';
import { EnvironmentFromVariable } from '#~/pages/projects/types';

export const getConnectionsFromNotebook = (
  notebook: NotebookKind,
  projectConnections: Connection[],
): Connection[] => {
  const connectionNames = [];
  for (const env of notebook.spec.template.spec.containers[0].envFrom ?? []) {
    if (env.secretRef?.name) {
      connectionNames.push(env.secretRef.name);
    }
  }

  const attachedConnections: Connection[] = [];
  for (const name of connectionNames) {
    const found = projectConnections.find((c) => c.metadata.name === name);
    if (found) {
      attachedConnections.push(found);
    }
  }
  return attachedConnections;
};

const isNameInConnections = (name: string | undefined, connections: Connection[]): boolean =>
  !!name && !!connections.find((c) => name === c.metadata.name);

export const setConnectionsOnEnvFrom = (
  notebookConnections: Connection[],
  envFrom: EnvironmentFromVariable[],
  projectConnections: Connection[],
): EnvironmentFromVariable[] => {
  const newEnvFrom = envFrom.filter(
    (env) => !isNameInConnections(env.secretRef?.name, projectConnections),
  );
  newEnvFrom.push(
    ...notebookConnections.map((c) => ({
      secretRef: { name: c.metadata.name },
    })),
  );
  return newEnvFrom;
};
