import * as React from 'react';
import { Button, Divider } from '@patternfly/react-core';
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

  const isPvcsEmpty = pvcs.length === 0;

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
        isEmpty={isPvcsEmpty}
        loadError={loadError}
        emptyState={
          <EmptyDetailsList
            title="No storage"
            description="To get started, add existing or create new cluster storage."
          />
        }
      >
        <StorageTable pvcs={pvcs} refresh={refresh} onAddPVC={() => setOpen(true)} />
      </DetailsSection>
      {isPvcsEmpty && <Divider data-id="details-page-section-divider" />}
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
