import { Connection } from '#~/concepts/connectionTypes/types';
import { NotebookKind } from '#~/k8sTypes';

export const getConnectionsFromNotebook = (
  notebook: NotebookKind,
  projectConnections: Connection[],
): Connection[] => {
  const connections: Connection[] = [];
  notebook.metadata.annotations?.['opendatahub.io/connections']
    ?.split(',')
    .forEach((namespaceAndName) => {
      const [, name] = namespaceAndName.split('/');
      const found = projectConnections.find((c) => c.metadata.name === name);
      if (found) {
        connections.push(found);
      }
    });

  return connections;
};
