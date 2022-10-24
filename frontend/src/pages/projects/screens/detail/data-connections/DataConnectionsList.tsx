import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import DataConnectionsTable from './DataConnectionsTable';
import useDataConnections from './useDataConnections';
import AddDataConnectionModal from './AddDataConnectionModal';

const DataConnectionsList: React.FC = () => {
  const [connections, loaded, error, refreshDataConnections] = useDataConnections();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.DATA_CONNECTIONS}
        title={ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS]}
        actions={[
          <Button
            key={`action-${ProjectSectionID.DATA_CONNECTIONS}`}
            variant="secondary"
            onClick={() => setOpen(true)}
          >
            Add data connection
          </Button>,
        ]}
        isLoading={!loaded}
        isEmpty={connections.length === 0}
        loadError={error}
        emptyState={
          <EmptyDetailsList
            title="No data connections"
            description="To get started, add data to your project."
          />
        }
      >
        <DataConnectionsTable
          connections={connections}
          refreshDataConnections={refreshDataConnections}
        />
      </DetailsSection>
      <AddDataConnectionModal
        isOpen={open}
        onClose={(submitted) => {
          if (submitted) {
            refreshDataConnections();
          }
          setOpen(false);
        }}
      />
    </>
  );
};

export default DataConnectionsList;
