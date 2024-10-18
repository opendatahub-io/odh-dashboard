import React from 'react';

import { Flex, FlexItem, Icon, Popover, Truncate } from '@patternfly/react-core';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { InfoCircleIcon } from '@patternfly/react-icons';

import { Table } from '~/components/table';
import { StorageData, StorageType } from '~/pages/projects/types';
import { clusterStorageTableColumns } from './constants';
import { ClusterStorageEditModal } from './ClusterStorageEditModal';
import { ClusterStorageDetachModal } from './ClusterStorageDetachModal';

interface ClusterStorageTableProps {
  storageData: StorageData[];
  workbenchName: string;
  setStorageData: React.Dispatch<React.SetStateAction<StorageData[]>>;
}

export const ClusterStorageTable: React.FC<ClusterStorageTableProps> = ({
  storageData,
  workbenchName,
  setStorageData,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDetachModalOpen, setIsDetachModalOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number>();
  const selectedStorage = storageData.find((formData) => formData.id === selectedId);
  const hasUpdatedDefaultNameRef = React.useRef(false);

  const updateStorageData = React.useCallback(
    (newStorageData: StorageData) => {
      setStorageData((prevData) =>
        prevData.map((pvcData, pvcIndex) => {
          if (pvcIndex === selectedId) {
            return newStorageData;
          }

          return pvcData;
        }),
      );
      hasUpdatedDefaultNameRef.current = true;
    },
    [selectedId, setStorageData],
  );

  const updateInitialStorageName = React.useCallback(() => {
    const [initialStorageData] = storageData;
    const { name: pvcName } = initialStorageData;

    if (initialStorageData.storageType === StorageType.NEW_PVC) {
      setStorageData([
        {
          ...initialStorageData,
          name: workbenchName
            ? (!pvcName.includes('-') ? `${workbenchName}-${pvcName}` : pvcName).replace(
                /.*(?=-)/,
                workbenchName,
              )
            : pvcName.includes('-')
            ? pvcName.split('-')[1]
            : pvcName,
        },
      ]);
    }
  }, [workbenchName, storageData, setStorageData]);

  // When the initial storage data has yet to be edited by the user,
  // prepend the workbench name when one exists.
  React.useEffect(() => {
    if (!hasUpdatedDefaultNameRef.current && storageData.length) {
      updateInitialStorageName();
    }
  }, [storageData.length, updateInitialStorageName]);

  return (
    <>
      <Table
        data-testid="cluster-storage-table"
        borders={false}
        variant="compact"
        columns={clusterStorageTableColumns}
        data={storageData}
        rowRenderer={(row) => (
          <Tr key={row.id} data-testid={`cluster-storage-table-row ${row.id}`}>
            <Td dataLabel="Name">
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Truncate content={row.name} />
                </FlexItem>

                {!hasUpdatedDefaultNameRef.current && row.storageType === StorageType.NEW_PVC && (
                  <FlexItem>
                    <Popover
                      aria-label="Default storage name popover"
                      bodyContent="This is the default cluster storage. Its name can be edited."
                    >
                      <Icon status="info" size="sm">
                        <InfoCircleIcon />
                      </Icon>
                    </Popover>
                  </FlexItem>
                )}
              </Flex>
            </Td>
            <Td dataLabel="Storage size">Max {row.size}</Td>
            <Td dataLabel="Mount path">{row.mountPath}</Td>
            <Td isActionCell>
              <ActionsColumn
                items={[
                  {
                    title: 'Edit',
                    onClick: () => {
                      setIsEditModalOpen(true);
                      setSelectedId(row.id);
                    },
                  },
                  {
                    title: 'Detach',
                    onClick: () => {
                      setIsDetachModalOpen(true);
                      setSelectedId(row.id);
                    },
                  },
                ]}
              />
            </Td>
          </Tr>
        )}
      />

      {isEditModalOpen && selectedStorage && (
        <ClusterStorageEditModal
          storageData={selectedStorage}
          onUpdate={updateStorageData}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {isDetachModalOpen && selectedStorage && (
        <ClusterStorageDetachModal
          onConfirm={() => {
            setStorageData((prevData) => prevData.filter((_, pvcIndex) => pvcIndex !== selectedId));
            setIsDetachModalOpen(false);
          }}
          storageName={selectedStorage.name}
          onClose={() => setIsDetachModalOpen(false)}
        />
      )}
    </>
  );
};
