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
import ManageStorageModal from './ManageStorageModal';

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
