import * as React from 'react';
import { Button, Popover, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsView from '#~/components/EmptyDetailsView';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '#~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { useAccessReview } from '#~/api';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { PVCModel } from '#~/api/models';
import StorageTable from './StorageTable';
import ClusterStorageModal from './ClusterStorageModal';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: PVCModel.apiGroup,
  resource: PVCModel.plural,
  verb: 'create',
};

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    currentProject,
    notebooks: { refresh: refreshNotebooks },
    pvcs: { data: pvcs, loaded: pvcsLoaded, error: pvcsError, refresh: refreshPvcs },
  } = React.useContext(ProjectDetailsContext);
  const isPvcsEmpty = pvcs.length === 0;

  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const refresh = () => {
    refreshPvcs();
    refreshNotebooks();
  };

  const getCreateButton = (testId: string) => {
    if (!allowCreate) {
      return (
        <Tooltip content="You do not have permission to add cluster storage">
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="primary"
            data-testid={testId}
            isAriaDisabled
          >
            Add cluster storage
          </Button>
        </Tooltip>
      );
    }
    return (
      <Button
        onClick={() => setOpen(true)}
        key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
        variant="primary"
        data-testid={testId}
      >
        Add cluster storage
      </Button>
    );
  };

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.CLUSTER_STORAGES}
        objectType={ProjectObjectType.clusterStorage}
        title={ProjectSectionTitles[ProjectSectionID.CLUSTER_STORAGES] || ''}
        popover={
          <Popover
            headerContent="About cluster storage"
            bodyContent="Cluster storage saves your project's data on a selected cluster. You can optionally connect cluster storage to a workbench. "
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
        actions={[getCreateButton('actions-cluster-storage-button')]}
        isLoading={!pvcsLoaded}
        isEmpty={isPvcsEmpty}
        loadError={pvcsError}
        emptyState={
          <EmptyDetailsView
            title="Start by adding cluster storage"
            description="Cluster storage saves your project's data on a selected cluster. You can optionally connect cluster storage to a workbench."
            iconImage={typedEmptyImage(ProjectObjectType.clusterStorage)}
            imageAlt="add cluster storage"
            createButton={getCreateButton('cluster-storage-button')}
          />
        }
      >
        {!isPvcsEmpty ? (
          <StorageTable pvcs={pvcs} refresh={refresh} onAddPVC={() => setOpen(true)} />
        ) : null}
      </DetailsSection>
      {isOpen ? (
        <ClusterStorageModal
          onClose={(submitted) => {
            setOpen(false);
            if (submitted) {
              refresh();
            }
          }}
        />
      ) : null}
    </>
  );
};

export default StorageList;
