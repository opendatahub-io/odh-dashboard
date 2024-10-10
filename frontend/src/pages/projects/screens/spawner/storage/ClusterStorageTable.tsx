import React from 'react';

import { Flex, FlexItem, Icon, Popover, Truncate } from '@patternfly/react-core';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { InfoCircleIcon } from '@patternfly/react-icons';

import { Table } from '~/components/table';
import { StorageData } from '~/pages/projects/types';
import { clusterStorageTableColumns } from './constants';
import { ClusterStorageEditModal } from './ClusterStorageEditModal';

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
  const [selectedId, setSelectedId] = React.useState<number>();
  const selectedStorage =
    storageData.find((formData) => formData.id === selectedId) || storageData[0];
  const hasUpdatedDefaultNameRef = React.useRef(false);

  const updateStorageData = React.useCallback(
    (newStorageData: StorageData) => {
      setStorageData((prevData) =>
        prevData.map((pvcData) => {
          if (newStorageData.id === selectedId) {
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
    const { name: pvcName } = initialStorageData.creating.nameDesc;

    setStorageData([
      {
        ...initialStorageData,
        creating: {
          ...initialStorageData.creating,
          nameDesc: {
            ...initialStorageData.creating.nameDesc,
            name: workbenchName
              ? (!pvcName.includes('-') ? `${workbenchName}-${pvcName}` : pvcName).replace(
                  /.*(?=-)/,
                  workbenchName,
                )
              : pvcName.includes('-')
              ? pvcName.split('-')[1]
              : pvcName,
          },
        },
      },
    ]);
  }, [workbenchName, storageData, setStorageData]);

  // When the initial storage data has yet to be edited by the user,
  // prepend the workbench name when one exists.
  React.useEffect(() => {
    if (!hasUpdatedDefaultNameRef.current) {
      updateInitialStorageName();
    }
  }, [updateInitialStorageName]);

  return (
    <>
      <Table
        data-testid="cluster-storage-table-field"
        borders={false}
        variant="compact"
        columns={clusterStorageTableColumns}
        data={storageData}
        rowRenderer={(row) => (
          <Tr key={row.id}>
            <Td>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Truncate content={row.creating.nameDesc.name} />
                </FlexItem>

                {!hasUpdatedDefaultNameRef.current && (
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
            <Td>{row.creating.size}</Td>
            <Td>{row.creating.mountPath}</Td>
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
                    onClick: () =>
                      setStorageData((prevData) =>
                        prevData.filter((prevClusterStorage) => prevClusterStorage.id !== row.id),
                      ),
                  },
                ]}
              />
            </Td>
          </Tr>
        )}
      />

      {isEditModalOpen && (
        <ClusterStorageEditModal
          storageData={selectedStorage}
          setStorageData={updateStorageData}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
};
