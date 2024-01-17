import * as React from 'react';
import { Badge, Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import emptyStateImg from '~/images/empty-state-data-connections.svg';
import DetailsSectionAlt from '~/pages/projects/screens/detail/DetailsSectionAlt';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import ManageDataConnectionModal from './ManageDataConnectionModal';
import DataConnectionsTable from './DataConnectionsTable';

const DataConnectionsListAlt: React.FC = () => {
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
      <DetailsSectionAlt
        typeModifier="data-connections"
        iconSrc="../images/UI_icon-Red_Hat-Connected-RGB.svg"
        iconAlt="Data connections icon"
        id={ProjectSectionID.DATA_CONNECTIONS}
        badge={<Badge>{connections.length}</Badge>}
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
            description="Adding a data connection to your project allows you toconnect data inputs to your workbenches."
            iconImage={emptyStateImg}
            allowCreate={rbacLoaded && allowCreate}
            createButton={
              <Button
                key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
                onClick={() => setOpen(true)}
                variant="primary"
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
      </DetailsSectionAlt>
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

export default DataConnectionsListAlt;
