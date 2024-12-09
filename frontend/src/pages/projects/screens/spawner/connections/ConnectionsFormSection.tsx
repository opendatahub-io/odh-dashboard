import React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  FormSection,
  Tooltip,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { SortableData, Table } from '~/components/table';
import { createSecret, replaceSecret } from '~/api';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import {
  filterEnabledConnectionTypes,
  getConnectionTypeDisplayName,
  isConnection,
} from '~/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import { useNotebooksStates } from '~/pages/projects/notebook/useNotebooksStates';
import { SpawnerPageSectionTitles } from '~/pages/projects/screens/spawner/const';
import { SpawnerPageSectionID } from '~/pages/projects/screens/spawner/types';
import { ManageConnectionModal } from '~/pages/projects/screens/detail/connections/ManageConnectionsModal';
import ConnectionsTableRow from '~/pages/projects/screens/detail/connections/ConnectionsTableRow';
import { SelectConnectionsModal } from './SelectConnectionsModal';
import { connectionEnvVarConflicts, DuplicateEnvVarWarning } from './DuplicateEnvVarsWarning';
import { DetachConnectionModal } from './DetachConnectionModal';

const getColumns = (connectionTypes: ConnectionTypeConfigMapObj[]): SortableData<Connection>[] => [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: 'type',
    label: 'Type',
    sortable: (a, b) =>
      (getConnectionTypeDisplayName(a, connectionTypes) || '').localeCompare(
        getConnectionTypeDisplayName(b, connectionTypes) || '',
      ),
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

type Props = {
  project: ProjectKind;
  projectConnections: Connection[];
  refreshProjectConnections: () => void;
  notebook?: NotebookKind;
  notebookDisplayName: string;
  selectedConnections: Connection[];
  setSelectedConnections: (connections: Connection[]) => void;
};

export const ConnectionsFormSection: React.FC<Props> = ({
  project,
  projectConnections,
  refreshProjectConnections,
  notebook,
  notebookDisplayName,
  selectedConnections,
  setSelectedConnections,
}) => {
  const [connectionTypes] = useWatchConnectionTypes();

  const enabledConnectionTypes = React.useMemo(
    () => filterEnabledConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const columns = React.useMemo(() => getColumns(connectionTypes), [connectionTypes]);

  const initialNumberConnections = React.useRef(selectedConnections.length);
  const notebookArray = React.useMemo(() => (notebook ? [notebook] : []), [notebook]);
  const [notebookStates] = useNotebooksStates(
    notebookArray,
    notebook?.metadata.namespace || '',
    initialNumberConnections.current > 0,
  );
  const isRunning = React.useMemo(
    () =>
      !!notebookStates.find((n) => n.notebook.metadata.name === notebook?.metadata.name)?.isRunning,
    [notebookStates, notebook],
  );

  const unselectedConnections = React.useMemo(
    () =>
      projectConnections.filter(
        (pc) => !selectedConnections.find((sc) => pc.metadata.name === sc.metadata.name),
      ),
    [projectConnections, selectedConnections],
  );

  const [showAttachConnectionsModal, setShowAttachConnectionsModal] = React.useState(false);
  const [detachConnectionModal, setDetachConnectionModal] = React.useState<Connection>();
  const [manageConnectionModal, setManageConnectionModal] = React.useState<{
    connection?: Connection;
    isEdit?: boolean;
  }>();

  const envVarConflicts = React.useMemo(
    () => connectionEnvVarConflicts(selectedConnections),
    [selectedConnections],
  );

  const connectionsTooltipRef = React.useRef<HTMLButtonElement>();
  const connectionTypesTooltipRef = React.useRef<HTMLButtonElement>();

  return (
    <FormSection
      title={
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>{SpawnerPageSectionTitles[SpawnerPageSectionID.CONNECTIONS]}</FlexItem>
          <FlexItem>
            <Button
              data-testid="attach-existing-connection-button"
              aria-describedby={
                unselectedConnections.length === 0 ? 'no-connections-tooltip' : undefined
              }
              variant="secondary"
              isAriaDisabled={unselectedConnections.length === 0}
              onClick={() => setShowAttachConnectionsModal(true)}
              ref={connectionsTooltipRef}
            >
              Attach existing connections
            </Button>
            {unselectedConnections.length === 0 && (
              <Tooltip
                id="no-connections-tooltip"
                content="No connections available"
                triggerRef={connectionsTooltipRef}
              />
            )}
          </FlexItem>
          <FlexItem>
            <Button
              data-testid="create-connection-button"
              aria-describedby={
                enabledConnectionTypes.length === 0 ? 'no-connection-types-tooltip' : undefined
              }
              variant="secondary"
              content="No connection types available"
              isAriaDisabled={enabledConnectionTypes.length === 0}
              onClick={() => setManageConnectionModal({ connection: undefined, isEdit: false })}
              ref={connectionTypesTooltipRef}
            >
              Create connection
            </Button>
            {enabledConnectionTypes.length === 0 && (
              <Tooltip
                id="no-connection-types-tooltip"
                content="No connection types available"
                triggerRef={connectionTypesTooltipRef}
              />
            )}
          </FlexItem>
        </Flex>
      }
      id={SpawnerPageSectionID.CONNECTIONS}
      aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.CONNECTIONS]}
    >
      {envVarConflicts.length > 0 && <DuplicateEnvVarWarning envVarConflicts={envVarConflicts} />}
      {selectedConnections.length > 0 ? (
        <Table
          data={selectedConnections}
          data-testid="connections-table"
          columns={columns}
          rowRenderer={(connection) => (
            <ConnectionsTableRow
              key={connection.metadata.name}
              obj={connection}
              connectionTypes={connectionTypes}
              kebabActions={[
                {
                  title: 'Edit',
                  onClick: () => {
                    setManageConnectionModal({ connection, isEdit: true });
                  },
                },
                { isSeparator: true },
                {
                  title: 'Detach',
                  onClick: () => {
                    setDetachConnectionModal(connection);
                  },
                },
              ]}
              showCompatibilityCell={false}
              showConnectedResourcesCell={false}
              showWarningIcon={
                !!envVarConflicts.find(
                  (conflict) =>
                    conflict.firstConnection === getDisplayNameFromK8sResource(connection) ||
                    conflict.secondConnection === getDisplayNameFromK8sResource(connection),
                )
              }
            />
          )}
          isStriped
        />
      ) : (
        <Bullseye>
          <EmptyState headingLevel="h2" icon={PlusCircleIcon} titleText="No connections">
            <EmptyStateBody>
              Connections enable you to store and retrieve information that typically should not be
              stored in code. For example, you can store details (including credentials) for object
              storage, databases, and more. You can then attach the connections to artifacts in your
              project, such as workbenches and model servers.
            </EmptyStateBody>
          </EmptyState>
        </Bullseye>
      )}
      {showAttachConnectionsModal && (
        <SelectConnectionsModal
          connectionTypes={connectionTypes}
          connectionsToList={unselectedConnections}
          onSave={(connections) => {
            setSelectedConnections([...selectedConnections, ...connections]);
            setShowAttachConnectionsModal(false);
          }}
          onClose={() => setShowAttachConnectionsModal(false)}
        />
      )}
      {detachConnectionModal && (
        <DetachConnectionModal
          connection={detachConnectionModal}
          isRunning={isRunning}
          notebookDisplayName={notebookDisplayName}
          onDetach={() => {
            setSelectedConnections(
              selectedConnections.filter(
                (c) => c.metadata.name !== detachConnectionModal.metadata.name,
              ),
            );
            setDetachConnectionModal(undefined);
          }}
          onClose={() => setDetachConnectionModal(undefined)}
        />
      )}
      {manageConnectionModal && (
        <ManageConnectionModal
          connection={manageConnectionModal.connection}
          connectionTypes={connectionTypes}
          project={project}
          onClose={(refresh) => {
            setManageConnectionModal(undefined);
            if (refresh) {
              refreshProjectConnections();
            }
          }}
          onSubmit={async (connection: Connection) => {
            if (manageConnectionModal.isEdit) {
              const response = await replaceSecret(connection);
              if (isConnection(response)) {
                setSelectedConnections(
                  selectedConnections.map((c) =>
                    c.metadata.name === response.metadata.name ? response : c,
                  ),
                );
              }
              return response;
            }
            const response = await createSecret(connection);
            if (isConnection(response)) {
              setSelectedConnections([...selectedConnections, response]);
            }
            return response;
          }}
          isEdit={manageConnectionModal.isEdit}
        />
      )}
    </FormSection>
  );
};
