import * as React from 'react';
import ManageStorageModal from '~/pages/projects/screens/detail/storage/ManageStorageModal';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import EmptyComponentsCard from '~/pages/projects/screens/detail/EmptyComponentsCard';

type StorageCardEmptyProps = {
  allowCreate: boolean;
};

const StorageCardEmpty: React.FC<StorageCardEmptyProps> = ({ allowCreate }) => {
  const {
    pvcs: { refresh },
  } = React.useContext(ProjectDetailsContext);
  const [isOpen, setOpen] = React.useState(false);

  return (
    <>
      <EmptyComponentsCard
        description="For data science projects that require data to be retained, you can add cluster storage to the project"
        allowCreate={allowCreate}
        onAction={() => setOpen(true)}
        createText="Add cluster storage"
      />
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

export default StorageCardEmpty;
