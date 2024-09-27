import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { Connection } from '~/concepts/connectionTypes/types';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import { createSecret, replaceSecret } from '~/api';
import ConnectionsTable from './ConnectionsTable';
import { ManageConnectionModal } from './ManageConnectionsModal';

const ConnectionsDescription =
  'Connections enable you to store and retrieve information that typically should not be stored in code. For example, you can store details (including credentials) for object storage, databases, and more. You can then attach the connections to artifacts in your project, such as workbenches and model servers.';

const ConnectionsList: React.FC = () => {
  const {
    connections: { data: connections, loaded, error, refresh: refreshConnections },
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const [connectionTypes, connectionTypesLoaded, connectionTypesError] = useWatchConnectionTypes();

  const [manageConnectionModal, setManageConnectionModal] = React.useState<{
    connection?: Connection;
    isEdit?: boolean;
  }>();

  return (
    <DetailsSection
      objectType={ProjectObjectType.connections}
      id={ProjectSectionID.CONNECTIONS}
      title={ProjectSectionTitles[ProjectSectionID.CONNECTIONS]}
      popover={
        <Popover headerContent="About connections" bodyContent={ConnectionsDescription}>
          <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
        </Popover>
      }
      actions={[
        <Button
          key={`action-${ProjectSectionID.CONNECTIONS}`}
          data-testid="add-connection-button"
          variant="primary"
          onClick={() => {
            setManageConnectionModal({});
          }}
        >
          Add connection
        </Button>,
      ]}
      isLoading={!loaded || !connectionTypesLoaded}
      isEmpty={connections.length === 0}
      loadError={error || connectionTypesError}
      emptyState={
        <EmptyDetailsView
          title="No connections"
          description={ConnectionsDescription}
          iconImage={typedEmptyImage(ProjectObjectType.connections)}
          imageAlt="create a connection"
          createButton={
            <Button
              key={`action-${ProjectSectionID.CONNECTIONS}`}
              variant="primary"
              data-testid="create-connection-button"
            >
              Create connection
            </Button>
          }
        />
      }
    >
      <ConnectionsTable
        namespace={currentProject.metadata.name}
        connections={connections}
        connectionTypes={connectionTypes}
        refreshConnections={refreshConnections}
        setManageConnectionModal={(modalConnection?: Connection) =>
          setManageConnectionModal({ connection: modalConnection, isEdit: true })
        }
      />
      {manageConnectionModal && (
        <ManageConnectionModal
          connection={manageConnectionModal.connection}
          connectionTypes={connectionTypes}
          project={currentProject}
          onClose={(refresh) => {
            setManageConnectionModal(undefined);
            if (refresh) {
              refreshConnections();
            }
          }}
          onSubmit={(connection: Connection) =>
            manageConnectionModal.isEdit ? replaceSecret(connection) : createSecret(connection)
          }
          isEdit={manageConnectionModal.isEdit}
        />
      )}
    </DetailsSection>
  );
};

export default ConnectionsList;
