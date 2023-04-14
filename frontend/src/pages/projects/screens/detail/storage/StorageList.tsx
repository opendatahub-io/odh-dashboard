import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ManageStorageModal from './ManageStorageModal';
import StorageTable from './StorageTable';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    pvcs: { data: pvcs, loaded, error: loadError },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.CLUSTER_STORAGES}
        title={ProjectSectionTitles[ProjectSectionID.CLUSTER_STORAGES] || ''}
        actions={[
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="secondary"
          >
            Add cluster storage
          </Button>,
        ]}
        isLoading={!loaded}
        isEmpty={pvcs.length === 0}
        loadError={loadError}
        emptyState={
          <EmptyDetailsList
            title="No storage"
            description="Choose existing, or add new on cluster storage."
          />
        }
      >
        <StorageTable pvcs={pvcs} refresh={refresh} onAddPVC={() => setOpen(true)} />
      </DetailsSection>
      <ManageStorageModal
        isOpen={isOpen}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            refresh();
          }
        }}
      />
    </>
  );
};

export default StorageList;
