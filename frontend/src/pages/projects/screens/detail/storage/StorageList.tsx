import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import StorageTable from './StorageTable';
import ClusterStorageModal from './ClusterStorageModal';

type StorageListProps = {
  subHeaderComponent?: React.ReactNode;
  globalView?: boolean;
};

const StorageList: React.FC<StorageListProps> = ({ subHeaderComponent, globalView }) => {
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

  const emptyState = (
    <EmptyDetailsView
      title="Start by adding cluster storage"
      description="Cluster storage saves your project’s data on a selected cluster. You can optionally connect cluster storage to a workbench."
      iconImage={typedEmptyImage(ProjectObjectType.clusterStorage)}
      imageAlt="add cluster storage"
      createButton={
        !globalView ? (
          <Button
            data-testid="cluster-storage-button"
            onClick={() => setOpen(true)}
            variant="primary"
          >
            Add cluster storage
          </Button>
        ) : null
      }
    />
  );

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
        subHeaderComponent={subHeaderComponent}
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
        isEmpty={!globalView && isPvcsEmpty}
        loadError={pvcsError}
        emptyState={emptyState}
      >
        {!isPvcsEmpty ? (
          <StorageTable pvcs={pvcs} refresh={refresh} onAddPVC={() => setOpen(true)} />
        ) : (
          emptyState
        )}
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
