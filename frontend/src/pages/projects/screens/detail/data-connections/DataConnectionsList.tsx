import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import DataConnectionsTable from './DataConnectionsTable';
import ManageDataConnectionModal from './ManageDataConnectionModal';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

const DataConnectionsList: React.FC = () => {
  const {
    dataConnections: { data: connections, loaded, error },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.DATA_CONNECTIONS}
        title={ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS] || ''}
        actions={[
          <Button
            key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
            variant="secondary"
            onClick={() => setOpen(true)}
          >
            Add data connection
          </Button>,
        ]}
        isLoading={!loaded && !connections}
        isEmpty={connections.length === 0}
        loadError={error}
        emptyState={
          <EmptyDetailsList
            title="No data connections"
            description="To get started, add data to your project."
          />
        }
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
