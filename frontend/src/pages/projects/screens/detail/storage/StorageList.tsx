import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import DetailsSection from '../DetailsSection';
import { ProjectSectionID } from '../types';
import { ProjectSectionTitles } from '../const';
import ManageStorageModal from './ManageStorageModal';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import StorageTable from './StorageTable';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const {
    pvcs: { data: pvcs, loaded, error: loadError, refresh },
  } = React.useContext(ProjectDetailsContext);

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.STORAGES}
        title={ProjectSectionTitles[ProjectSectionID.STORAGES] || ''}
        actions={[
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.STORAGES}`}
            variant="secondary"
          >
            Add storage
          </Button>,
        ]}
        isLoading={!loaded}
        isEmpty={pvcs.length === 0}
        loadError={loadError}
        emptyState={
          <EmptyDetailsList
            title="No storage"
            description="Choose existing, or add new on cluster storage."
            includeDivider
          />
        }
      >
        <StorageTable pvcs={pvcs} refreshPVCs={refresh} />
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
