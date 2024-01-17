import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { useAccessReview } from '~/api';
import dataConnectionImage from '~/images/UI_icon-Red_Hat-Connected-RGB.svg';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import DataConnectionsTable from './DataConnectionsTable';
import ManageDataConnectionModal from './ManageDataConnectionModal';
import DataConnectionsCardEmpty from './DataConnectionsCardEmpty';

const DataConnectionsList: React.FC = () => {
  const {
    dataConnections: { data: connections, loaded, error },
    refreshAllProjectData,
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const isDataConnectionsEmpty = connections.length === 0;

  return (
    <>
      <DetailsSection
        iconSrc={dataConnectionImage}
        iconAlt="Data connections icon"
        id={ProjectSectionID.DATA_CONNECTIONS}
        title={ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS] || ''}
        popover={
          !isDataConnectionsEmpty ? (
            <Popover
              headerContent="About data connections"
              bodyContent="Adding a data connection to your project allows you to connect data inputs to your workbenches."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : undefined
        }
        actions={
          !isDataConnectionsEmpty
            ? [
                <Button
                  key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
                  variant="secondary"
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
        emptyState={<DataConnectionsCardEmpty allowCreate={rbacLoaded && allowCreate} />}
      >
        <DataConnectionsTable connections={connections} refreshData={refreshAllProjectData} />
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
