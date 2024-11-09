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
import ManageDataConnectionModal from './ManageDataConnectionModal';
import DataConnectionsTable from './DataConnectionsTable';

const DataConnectionsList: React.FC = () => {
  const {
    notebooks: { refresh: refreshNotebooks },
    dataConnections: {
      data: dataConnections,
      loaded: dataConnectionsLoaded,
      error: dataConnectionsError,
      refresh: refreshDataConnections,
    },
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);
  const isDataConnectionsEmpty = dataConnections.length === 0;

  const refresh = () => {
    refreshDataConnections();
    refreshNotebooks();
  };

  return (
    <>
      <DetailsSection
        objectType={ProjectObjectType.dataConnection}
        id={ProjectSectionID.DATA_CONNECTIONS}
        title={
          (!isDataConnectionsEmpty && ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS]) || ''
        }
        popover={
          !isDataConnectionsEmpty && (
            <Popover
              headerContent="About data connections"
              bodyContent="You can add data connections to workbenches to connect your project to data inputs and object storage buckets. You can also use data connections to specify the location of your models during deployment."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          )
        }
        actions={
          !isDataConnectionsEmpty
            ? [
                <Button
                  key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
                  data-testid="add-data-connection-button"
                  variant="primary"
                  onClick={() => setOpen(true)}
                >
                  Add data connection
                </Button>,
              ]
            : undefined
        }
        isLoading={!dataConnectionsLoaded}
        isEmpty={isDataConnectionsEmpty}
        loadError={dataConnectionsError}
        emptyState={
          <EmptyDetailsView
            title="Start by adding a data connection"
            description="You can add data connections to workbenches to connect your project to data inputs and object storage buckets. You can also use data connections to specify the location of your models during deployment."
            iconImage={typedEmptyImage(ProjectObjectType.dataConnection)}
            imageAlt="add a data connection"
            createButton={
              <Button
                key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
                onClick={() => setOpen(true)}
                variant="primary"
                data-testid="add-data-connection-button"
              >
                Add data connection
              </Button>
            }
          />
        }
      >
        {!isDataConnectionsEmpty && (
          <DataConnectionsTable connections={dataConnections} refreshData={refresh} />
        )}
      </DetailsSection>
      {open ? (
        <ManageDataConnectionModal
          onClose={(submitted) => {
            if (submitted) {
              refresh();
            }
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default DataConnectionsList;
