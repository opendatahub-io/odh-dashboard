import { Connection } from '#~/concepts/connectionTypes/types';
import { NotebookKind } from '#~/k8sTypes';

export const getConnectionsFromNotebook = (
  notebook: NotebookKind,
  projectConnections: Connection[],
): Connection[] => {
  const connections: Connection[] = [];
  const connectionsAnnotation = notebook.metadata.annotations?.['opendatahub.io/connections'];
  if (connectionsAnnotation) {
    connectionsAnnotation.split(',').forEach((namespaceAndName) => {
      const [, name] = namespaceAndName.split('/');
      const found = projectConnections.find((c) => c.metadata.name === name);
      if (found) {
        connections.push(found);
      }
    });
  } else {
    const envFrom = notebook.spec.template.spec.containers[0].envFrom ?? [];
    connections.push(
      ...projectConnections.filter((connection) =>
        envFrom.some((env) => env.secretRef?.name === connection.metadata.name),
      ),
    );
  }

  return connections;
};
