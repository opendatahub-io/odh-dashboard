import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import DetailsSection from '../DetailsSection';
import { ProjectSectionID } from '../types';
import { ProjectSectionTitles } from '../const';
import AddStorageModal from './AddStorageModal';
import useProjectPvcs from './useProjectPvcs';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import StorageTable from './StorageTable';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;
  const [pvcs, loaded, loadError, forceRefresh] = useProjectPvcs(projectName);

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
        <StorageTable pvcs={pvcs} refreshPVCs={forceRefresh} />
      </DetailsSection>
      <AddStorageModal
        isOpen={isOpen}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            forceRefresh();
          }
        }}
      />
    </>
  );
};

export default StorageList;
