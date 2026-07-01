import * as React from 'react';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { Table } from '@odh-dashboard/ui-core';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTestStatus,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';
import { SecretModel } from '#~/api/models';
import { testConnection } from '#~/services/connectionTestService';
import ConnectionsTableRow from './ConnectionsTableRow';
import { getColumns } from './connectionsTableColumns';
import { ConnectionsDeleteModal } from './ConnectionsDeleteModal';

type ConnectionsTableProps = {
  namespace: string;
  connections: Connection[];
  connectionTypes?: ConnectionTypeConfigMapObj[];
  refreshConnections: () => void;
  setManageConnectionModal: (connection: Connection) => void;
};

const ConnectionsTable: React.FC<ConnectionsTableProps> = ({
  namespace,
  connections,
  connectionTypes,
  refreshConnections,
  setManageConnectionModal,
}) => {
  const [deleteConnection, setDeleteConnection] = React.useState<Connection>();
  const [testingConnections, setTestingConnections] = React.useState<Map<string, AbortController>>(
    () => new Map(),
  );

  const columns = React.useMemo(() => getColumns(connectionTypes), [connectionTypes]);

  // Abort all in-progress tests on unmount
  React.useEffect(
    () => () => {
      testingConnections.forEach((controller) => controller.abort());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run cleanup on unmount
    [],
  );

  const patchConnectionAnnotations = React.useCallback(
    async (
      connection: Connection,
      status: ConnectionTestStatus,
      message: string,
    ): Promise<void> => {
      try {
        await k8sPatchResource({
          model: SecretModel,
          queryOptions: { name: connection.metadata.name, ns: namespace },
          patches: [
            {
              op: 'add',
              path: '/metadata/annotations',
              value: {
                ...connection.metadata.annotations,
                [CONNECTION_TEST_ANNOTATIONS.STATUS]: status,
                [CONNECTION_TEST_ANNOTATIONS.TIMESTAMP]: new Date().toISOString(),
                [CONNECTION_TEST_ANNOTATIONS.MESSAGE]: message,
              },
            },
          ],
        });
      } catch {
        // Annotation patch failed — local state will still be updated via refresh
      }
    },
    [namespace],
  );

  const handleTestConnection = React.useCallback(
    (connection: Connection) => {
      const connectionName = connection.metadata.name;

      // Abort any existing test for this connection
      const existingController = testingConnections.get(connectionName);
      if (existingController) {
        existingController.abort();
      }

      const controller = new AbortController();
      setTestingConnections((prev) => {
        const next = new Map(prev);
        next.set(connectionName, controller);
        return next;
      });

      // Extract connection type
      const connectionType =
        connection.metadata.annotations['opendatahub.io/connection-type-ref'] ??
        connection.metadata.annotations['opendatahub.io/connection-type'] ??
        '';

      // Decode base64-encoded field values from the K8s Secret
      const fieldValues: Record<string, string> = {};
      if (connection.data) {
        Object.entries(connection.data).forEach(([key, value]) => {
          fieldValues[key] = atob(value);
        });
      }

      // Optimistically patch the annotation to "testing"
      patchConnectionAnnotations(connection, ConnectionTestStatus.TESTING, '').then(() => {
        refreshConnections();
      });

      // Fire the background test
      testConnection({ connectionType, fieldValues }, controller.signal)
        .then(async (result) => {
          if (!controller.signal.aborted) {
            const testStatus = result.success
              ? ConnectionTestStatus.VERIFIED
              : ConnectionTestStatus.FAILED;
            await patchConnectionAnnotations(connection, testStatus, result.message);
            refreshConnections();
          }
        })
        .catch(async (e: Error) => {
          if (!controller.signal.aborted) {
            await patchConnectionAnnotations(connection, ConnectionTestStatus.FAILED, e.message);
            refreshConnections();
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setTestingConnections((prev) => {
              const next = new Map(prev);
              next.delete(connectionName);
              return next;
            });
          }
        });
    },
    [testingConnections, patchConnectionAnnotations, refreshConnections],
  );

  const handleEditConnection = React.useCallback(
    (connection: Connection) => {
      // Abort any in-progress test for this connection
      const controller = testingConnections.get(connection.metadata.name);
      if (controller) {
        controller.abort();
        setTestingConnections((prev) => {
          const next = new Map(prev);
          next.delete(connection.metadata.name);
          return next;
        });
      }
      setManageConnectionModal(connection);
    },
    [testingConnections, setManageConnectionModal],
  );

  return (
    <>
      <Table
        data={connections}
        data-testid="connection-table"
        columns={columns}
        rowRenderer={(connection) => (
          <ConnectionsTableRow
            key={connection.metadata.name}
            obj={connection}
            connectionTypes={connectionTypes}
            kebabActions={[
              {
                title: <span data-testid="edit-connection-action">Edit</span>,
                onClick: () => {
                  handleEditConnection(connection);
                },
              },
              {
                title: <span data-testid="test-connection-action">Test connection</span>,
                onClick: () => {
                  handleTestConnection(connection);
                },
                isDisabled: testingConnections.has(connection.metadata.name),
              },
              { isSeparator: true },
              {
                title: <span data-testid="delete-connection-action">Delete</span>,
                onClick: () => {
                  setDeleteConnection(connection);
                },
              },
            ]}
          />
        )}
        isStriped
      />
      {deleteConnection && (
        <ConnectionsDeleteModal
          namespace={namespace}
          deleteConnection={deleteConnection}
          onClose={(deleted) => {
            setDeleteConnection(undefined);
            if (deleted) {
              refreshConnections();
            }
          }}
        />
      )}
    </>
  );
};
export default ConnectionsTable;
