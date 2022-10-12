import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import DetailsSection from './DetailsSection';
import { ProjectSectionID } from './types';
import { ProjectSectionTitles } from './const';
import AddStorageModal from '../../modals/addStorageModal/AddStorageModal';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  return (
    <>
      <DetailsSection
        id={ProjectSectionID.STORAGE}
        title={ProjectSectionTitles[ProjectSectionID.STORAGE]}
        actions={[
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.STORAGE}`}
            variant="secondary"
          >
            Add storage
          </Button>,
        ]}
        isLoading={false}
        isEmpty
        loadError={undefined}
        emptyState={
          <EmptyDetailsList
            title="No storage"
            description="Choose existing, or add new on cluster storage."
          />
        }
      >
        No content
      </DetailsSection>
      <AddStorageModal isOpen={isOpen} onClose={() => setOpen(false)} />
    </>
  );
};

export default StorageList;
