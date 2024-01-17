import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { useAccessReview } from '~/api';
import storageIcon from '~/images/UI_icon-Red_Hat-Storage-RGB.svg';
import ManageStorageModal from './ManageStorageModal';
import StorageTable from './StorageTable';
import StorageCardEmpty from './StorageCardEmpty';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    pvcs: { data: pvcs, loaded, error: loadError },
    refreshAllProjectData: refresh,
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const isPvcsEmpty = pvcs.length === 0;

  return (
    <>
      <DetailsSection
        iconSrc={storageIcon}
        iconAlt="Storage"
        id={ProjectSectionID.CLUSTER_STORAGES}
        title={ProjectSectionTitles[ProjectSectionID.CLUSTER_STORAGES] || ''}
        popover={
          !isPvcsEmpty ? (
            <Popover
              headerContent="About cluster storage"
              bodyContent="For data science projects that require data to be retained, you can add cluster storage to the project."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : undefined
        }
        actions={
          !isPvcsEmpty
            ? [
                <Button
                  onClick={() => setOpen(true)}
                  key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
                  variant="secondary"
                >
                  Add cluster storage
                </Button>,
              ]
            : undefined
        }
        isLoading={!loaded}
        isEmpty={isPvcsEmpty}
        loadError={loadError}
        emptyState={<StorageCardEmpty allowCreate={rbacLoaded && allowCreate} />}
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
