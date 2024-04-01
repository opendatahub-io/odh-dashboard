import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import ManageDataConnectionModal from './ManageDataConnectionModal';
import DataConnectionsTable from './DataConnectionsTable';

const DataConnectionsList: React.FC = () => {
  const {
    currentProject,
    dataConnections: { data: connections, loaded, error },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
  const [open, setOpen] = React.useState(false);

  const isDataConnectionsEmpty = connections.length === 0;

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
              bodyContent="Adding a data connection to your project allows you to connect data inputs to your workbenches."
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
        isLoading={!loaded}
        isEmpty={isDataConnectionsEmpty}
        loadError={error}
        emptyState={
          <EmptyDetailsView
            title="Start by adding a data connection"
            description="Adding a data connection to your project allows you to connect data inputs to your workbenches."
            iconImage={typedEmptyImage(ProjectObjectType.dataConnection)}
            imageAlt="add a data connection"
            allowCreate={rbacLoaded && allowCreate}
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
        {!isDataConnectionsEmpty ? (
          <DataConnectionsTable connections={connections} refreshData={refreshAllProjectData} />
        ) : null}
      </DetailsSection>
      <ManageDataConnectionModal
        isOpen={open}
        onClose={(submitted) => {
          if (submitted) {
            refreshAllProjectData();
          }
          setOpen(false);
        }}
      />
    </>
  );
};

export default DataConnectionsList;
