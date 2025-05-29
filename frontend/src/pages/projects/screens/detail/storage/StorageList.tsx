import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsView from '#~/components/EmptyDetailsView';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '#~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import StorageTable from './StorageTable';
import ClusterStorageModal from './ClusterStorageModal';

const StorageList: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    notebooks: { refresh: refreshNotebooks },
    pvcs: { data: pvcs, loaded: pvcsLoaded, error: pvcsError, refresh: refreshPvcs },
  } = React.useContext(ProjectDetailsContext);
  const isPvcsEmpty = pvcs.length === 0;

  const refresh = () => {
    refreshPvcs();
    refreshNotebooks();
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
            bodyContent="Cluster storage saves your project’s data on a selected cluster. You can optionally connect cluster storage to a workbench. "
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
            data-testid="actions-cluster-storage-button"
          >
            Add cluster storage
          </Button>,
        ]}
        isLoading={!pvcsLoaded}
        isEmpty={isPvcsEmpty}
        loadError={pvcsError}
        emptyState={
          <EmptyDetailsView
            title="Start by adding cluster storage"
            description="Cluster storage saves your project’s data on a selected cluster. You can optionally connect cluster storage to a workbench."
            iconImage={typedEmptyImage(ProjectObjectType.clusterStorage)}
            imageAlt="add cluster storage"
            createButton={
              <Button
                data-testid="cluster-storage-button"
                onClick={() => setOpen(true)}
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
