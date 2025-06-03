import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import {
  Flex,
  FlexItem,
  Label,
  Skeleton,
  Content,
  ContentVariants,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, HddIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import StorageSizeBar from '#~/pages/projects/components/StorageSizeBars';
import ConnectedNotebookNames from '#~/pages/projects/notebook/ConnectedNotebookNames';
import { ConnectedNotebookContext } from '#~/pages/projects/notebook/useRelatedNotebooks';
import { TableRowTitleDescription } from '#~/components/table';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import AccessModeLabel from '#~/pages/projects/screens/detail/storage/AccessModeLabel';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
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
    <Tr {...(rowIndex % 2 === 0 && { isStriped: true })}>
      <Td dataLabel="Name">
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
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
        <Content component="p">{getDescriptionFromK8sResource(obj.pvc)}</Content>
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
                      color="yellow"
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
                        color="yellow"
                      >
                        Deprecated
                      </Label>
                    </Tooltip>
                  )
                )}
              </FlexItem>
            )}
          </Flex>
          <Content component={ContentVariants.small}>
            {storageClassesLoaded ? storageClassConfig?.description : <Skeleton />}
          </Content>
        </Td>
      )}
      <Td dataLabel="Access Mode">
        <Content component="p">
          <Flex>
            <AccessModeLabel accessModeString={obj.accessModes?.[0]} />
          </Flex>
        </Content>
      </Td>
      <Td dataLabel="Type">
        <Content component="p">
          <Flex>
            <FlexItem spacer={{ default: 'spacerSm' }}>
              <HddIcon />
            </FlexItem>
            <FlexItem>{` Persistent storage`}</FlexItem>
          </Flex>
        </Content>
      </Td>
      <Td dataLabel="Storage size">
        <StorageSizeBar pvc={obj.pvc} />
      </Td>
      {workbenchEnabled && (
        <Td dataLabel="Workbench connections">
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
  );
};

export default StorageTableRow;
