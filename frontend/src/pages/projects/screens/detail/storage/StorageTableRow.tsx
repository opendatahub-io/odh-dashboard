import * as React from 'react';
import {
  ActionsColumn,
  ExpandableRowContent,
  IAction,
  Tbody,
  Td,
  Tr,
} from '@patternfly/react-table';
import {
  Flex,
  FlexItem,
  Label,
  Skeleton,
  Text,
  TextVariants,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, HddIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import StorageSizeBar from '~/pages/projects/components/StorageSizeBars';
import ConnectedNotebookNames from '~/pages/projects/notebook/ConnectedNotebookNames';
import { ConnectedNotebookContext } from '~/pages/projects/notebook/useRelatedNotebooks';
import { TableRowTitleDescription } from '~/components/table';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { getStorageClassConfig } from '~/pages/storageClasses/utils';
import useIsRootVolume from './useIsRootVolume';
import StorageWarningStatus from './StorageWarningStatus';
import { StorageTableData } from './types';

type StorageTableRowProps = {
  rowIndex: number;
  obj: StorageTableData;
  storageClassesLoaded: boolean;
  onDeletePVC: (pvc: PersistentVolumeClaimKind) => void;
  onEditPVC: (pvc: PersistentVolumeClaimKind) => void;
  onAddPVC: () => void;
};

const StorageTableRow: React.FC<StorageTableRowProps> = ({
  rowIndex,
  obj,
  storageClassesLoaded,
  onDeletePVC,
  onEditPVC,
  onAddPVC,
}) => {
  const [isExpanded, setExpanded] = React.useState(false);
  const isRootVolume = useIsRootVolume(obj.pvc);

  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;
  const storageClassConfig = obj.storageClass && getStorageClassConfig(obj.storageClass);

  const actions: IAction[] = [
    {
      title: 'Edit storage',
      onClick: () => {
        onEditPVC(obj.pvc);
      },
    },
  ];

  if (!isRootVolume) {
    actions.push({ isSeparator: true });
    actions.push({
      title: 'Delete storage',
      onClick: () => {
        onDeletePVC(obj.pvc);
      },
    });
  }

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr {...(rowIndex % 2 === 0 && { isStriped: true })}>
        <Td
          expand={{
            rowIndex,
            expandId: 'storage-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <TableRowTitleDescription
                title={getDisplayNameFromK8sResource(obj.pvc)}
                resource={obj.pvc}
              />
            </FlexItem>
            <FlexItem>
              <StorageWarningStatus obj={obj.pvc} onEditPVC={onEditPVC} onAddPVC={onAddPVC} />
            </FlexItem>
          </Flex>
          <Text>{getDescriptionFromK8sResource(obj.pvc)}</Text>
        </Td>

        {isStorageClassesAvailable && (
          <Td modifier="truncate" dataLabel="Storage class">
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <TableRowTitleDescription
                  title={
                    storageClassConfig?.displayName ??
                    obj.storageClass?.metadata.name ??
                    obj.pvc.spec.storageClassName ??
                    ''
                  }
                  resource={obj.storageClass}
                />
              </FlexItem>
              {storageClassesLoaded && (
                <FlexItem>
                  {!obj.storageClass ? (
                    <Tooltip content="This storage class is deleted.">
                      <Label
                        data-testid="storage-class-deleted"
                        isCompact
                        icon={<ExclamationTriangleIcon />}
                        color="gold"
                      >
                        Deleted
                      </Label>
                    </Tooltip>
                  ) : (
                    storageClassConfig?.isEnabled === false && (
                      <Tooltip
                        data-testid="storage-class-deprecated-tooltip"
                        content="This storage class is deprecated, but the cluster storage is still active."
                      >
                        <Label
                          data-testid="storage-class-deprecated"
                          isCompact
                          icon={<ExclamationTriangleIcon />}
                          color="gold"
                        >
                          Deprecated
                        </Label>
                      </Tooltip>
                    )
                  )}
                </FlexItem>
              )}
            </Flex>
            <Text component={TextVariants.small}>
              {storageClassesLoaded ? storageClassConfig?.description : <Skeleton />}
            </Text>
          </Td>
        )}
        <Td dataLabel="Type">
          <Text>
            <Flex>
              <FlexItem spacer={{ default: 'spacerSm' }}>
                <HddIcon />
              </FlexItem>
              <FlexItem>{` Persistent storage`}</FlexItem>
            </Flex>
          </Text>
        </Td>
        {workbenchEnabled && (
          <Td dataLabel="Connected workbenches">
            <ConnectedNotebookNames
              context={ConnectedNotebookContext.EXISTING_PVC}
              relatedResourceName={obj.pvc.metadata.name}
            />
          </Td>
        )}
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Size">
          <ExpandableRowContent>
            <strong>Size</strong>
            <StorageSizeBar pvc={obj.pvc} />
          </ExpandableRowContent>
        </Td>
        <Td />
        <Td />
        <Td />
      </Tr>
    </Tbody>
  );
};

export default StorageTableRow;
