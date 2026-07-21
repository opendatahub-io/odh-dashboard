import * as React from 'react';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { Table } from '@odh-dashboard/ui-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTestStatus,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';
import { SecretModel } from '#~/api/models';
import { testConnection } from '#~/services/connectionTestService';
import {
  fireConnectionTestInitiated,
  fireConnectionTestCompleted,
} from '#~/concepts/connectionTypes/connectionTestTracking';
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
  const isConnectionTestEnabled = useIsAreaAvailable(SupportedArea.CONNECTION_TEST).status;
  const [deleteConnection, setDeleteConnection] = React.useState<Connection>();
  const [testingConnections, setTestingConnections] = React.useState<Map<string, AbortController>>(
    () => new Map(),
  );
  const testingConnectionsRef = React.useRef(testingConnections);
  testingConnectionsRef.current = testingConnections;

  const columns = React.useMemo(
    () => getColumns(connectionTypes, isConnectionTestEnabled),
    [connectionTypes, isConnectionTestEnabled],
  );

  React.useEffect(
    () => () => {
      testingConnectionsRef.current.forEach((controller) => controller.abort());
    },
    [],
  );

  const patchConnectionAnnotations = React.useCallback(
    async (
      connection: Connection,
      status: ConnectionTestStatus,
      message: string,
    ): Promise<void> => {
      try {
        const timestamp = new Date().toISOString();
        await k8sPatchResource({
          model: SecretModel,
          queryOptions: { name: connection.metadata.name, ns: namespace },
          patches: [
            {
              op: 'replace',
              path: `/metadata/annotations/${CONNECTION_TEST_ANNOTATIONS.STATUS.replace(
                /\//g,
                '~1',
              )}`,
              value: status,
            },
            {
              op: 'replace',
              path: `/metadata/annotations/${CONNECTION_TEST_ANNOTATIONS.TIMESTAMP.replace(
                /\//g,
                '~1',
              )}`,
              value: timestamp,
            },
            {
              op: 'replace',
              path: `/metadata/annotations/${CONNECTION_TEST_ANNOTATIONS.MESSAGE.replace(
                /\//g,
                '~1',
              )}`,
              value: message,
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
          try {
            fieldValues[key] = atob(value);
          } catch {
            fieldValues[key] = value;
          }
        });
      }

      // Fire the background test — "testing" is tracked client-side via testingConnections,
      // not persisted to annotations (avoids stale "testing" if the user navigates away)
      const startTime = Date.now();
      fireConnectionTestInitiated(connectionType, 1);

      testConnection({ connectionType, fieldValues }, controller.signal)
        .then(async (result) => {
          if (!controller.signal.aborted) {
            const testStatus = result.success
              ? ConnectionTestStatus.VERIFIED
              : ConnectionTestStatus.FAILED;
            await patchConnectionAnnotations(connection, testStatus, result.message);
            fireConnectionTestCompleted(connectionType, result, Date.now() - startTime);
            refreshConnections();
          }
        })
        .catch(async (e: Error) => {
          if (!controller.signal.aborted) {
            const failResult = { success: false as const, message: e.message };
            await patchConnectionAnnotations(connection, ConnectionTestStatus.FAILED, e.message);
            fireConnectionTestCompleted(connectionType, failResult, Date.now() - startTime);
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
            isTesting={isConnectionTestEnabled && testingConnections.has(connection.metadata.name)}
            showStatusCell={isConnectionTestEnabled}
            onEditConnection={handleEditConnection}
            kebabActions={[
              {
                title: <span data-testid="edit-connection-action">Edit</span>,
                onClick: () => {
                  handleEditConnection(connection);
                },
              },
              ...(isConnectionTestEnabled
                ? [
                    {
                      title: <span data-testid="test-connection-action">Test connection</span>,
                      onClick: () => {
                        handleTestConnection(connection);
                      },
                      isDisabled: testingConnections.has(connection.metadata.name),
                    },
                  ]
                : []),
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
