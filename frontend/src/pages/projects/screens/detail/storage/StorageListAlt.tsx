import * as React from 'react';
import { Badge, Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import emptyStateImg from '~/images/empty-state-cluster-storage.svg';
import iconImg from '~/images/UI_icon-Red_Hat-Storage-RGB.svg';
import DetailsSectionAlt from '~/pages/projects/screens/detail/DetailsSectionAlt';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import StorageTable from './StorageTable';
import ManageStorageModal from './ManageStorageModal';

const StorageListAlt: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    currentProject,
    pvcs: { data: pvcs, loaded, error: loadError },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const isPvcsEmpty = pvcs.length === 0;

  return (
    <>
      <DetailsSectionAlt
        id={ProjectSectionID.CLUSTER_STORAGES}
        typeModifier="cluster-storage"
        iconSrc={iconImg}
        iconAlt="Storage icon"
        title={ProjectSectionTitles[ProjectSectionID.CLUSTER_STORAGES] || ''}
        badge={<Badge>{pvcs.length}</Badge>}
        popover={
          <Popover
            headerContent="About cluster storage"
            bodyContent="For data science projects that require data to be retained, you can add cluster storage to the project."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
        actions={[
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="primary"
          >
            Add cluster storage
          </Button>,
        ]}
        isLoading={!loaded}
        isEmpty={isPvcsEmpty}
        loadError={loadError}
        emptyState={
          <EmptyDetailsView
            title="Start by adding cluster storage"
            description="For data science projects that require data to be retained, you can add cluster storage to the project."
            iconImage={emptyStateImg}
            allowCreate={rbacLoaded && allowCreate}
            createButton={
              <Button
                onClick={() => setOpen(true)}
                key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
                variant="primary"
              >
                Add cluster storage
              </Button>
            }
          />
        }
      >
        {!isPvcsEmpty ? (
          <StorageTable pvcs={pvcs} refresh={refresh} onAddPVC={() => setOpen(true)} />
        ) : null}
      </DetailsSectionAlt>
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

export default StorageListAlt;
