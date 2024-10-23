import React from 'react';
import { Button, Flex, FlexItem, FormSection } from '@patternfly/react-core';
import { StorageData } from '~/pages/projects/types';
import { SpawnerPageSectionID } from '~/pages/projects/screens/spawner/types';
import { SpawnerPageSectionTitles } from '~/pages/projects/screens/spawner/const';
import ManageStorageModal from '~/pages/projects/screens/detail/storage/ManageStorageModal';
import { ClusterStorageTable } from './ClusterStorageTable';
import { ClusterStorageEmptyState } from './ClusterStorageEmptyState';
import AttachExistingStorageModal from './AttachExistingStorageModal';

interface ClusterStorageFormSectionProps {
  storageData: StorageData[];
  setStorageData: React.Dispatch<React.SetStateAction<StorageData[]>>;
  workbenchName: string;
}

const ClusterStorageFormSection: React.FC<ClusterStorageFormSectionProps> = ({
  storageData,
  setStorageData,
  workbenchName,
}) => {
  const [isCreateStorageModalOpen, setIsCreateStorageModalOpen] = React.useState(false);
  const [isAttachStorageModalOpen, setIsAttachStorageModalOpen] = React.useState(false);

  const handleStorageAdd = React.useCallback(
    (sd: StorageData) => {
      const newStorageItem: StorageData = {
        ...sd,
        id: storageData.length,
      };

      setStorageData([...storageData, newStorageItem]);
    },
    [storageData, setStorageData],
  );

  return (
    <>
      <FormSection
        title={
          <Flex
            spaceItems={{ default: 'spaceItemsMd' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem spacer={{ default: 'spacerLg' }}>
              {SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
            </FlexItem>

            <Button
              variant="secondary"
              data-testid="existing-storage-button"
              onClick={() => setIsAttachStorageModalOpen(true)}
            >
              Attach existing storage
            </Button>

            <Button
              variant="secondary"
              data-testid="create-storage-button"
              onClick={() => setIsCreateStorageModalOpen(true)}
            >
              Create storage
            </Button>
          </Flex>
        }
        id={SpawnerPageSectionID.CLUSTER_STORAGE}
        aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
      >
        {storageData.length ? (
          <ClusterStorageTable
            storageData={storageData.map((formData, index) => ({ ...formData, id: index }))}
            setStorageData={setStorageData}
            workbenchName={workbenchName}
          />
        ) : (
          <ClusterStorageEmptyState />
        )}
      </FormSection>
      {isCreateStorageModalOpen && (
        <ManageStorageModal
          onClose={(submitted, sd) => {
            setIsCreateStorageModalOpen(false);
            if (submitted && sd) {
              handleStorageAdd(sd);
            }
          }}
          isSpawnerPage
        />
      )}
      {isAttachStorageModalOpen && (
        <AttachExistingStorageModal
          onClose={(submitted, sd) => {
            setIsAttachStorageModalOpen(false);
            if (submitted && sd) {
              handleStorageAdd(sd);
            }
          }}
        />
      )}
    </>
  );
};

export default ClusterStorageFormSection;
