import * as React from 'react';
import {
  ActionsColumn,
  ExpandableRowContent,
  IAction,
  Tbody,
  Td,
  Tr,
} from '@patternfly/react-table';
import { Flex, FlexItem, Text } from '@patternfly/react-core';
import { HddIcon } from '@patternfly/react-icons';
import { getPvcDescription, getPvcDisplayName } from '~/pages/projects/utils';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import StorageSizeBar from '~/pages/projects/components/StorageSizeBars';
import ConnectedNotebookNames from '~/pages/projects/notebook/ConnectedNotebookNames';
import { ConnectedNotebookContext } from '~/pages/projects/notebook/useRelatedNotebooks';
import { TableRowTitleDescription } from '~/components/table';
import useIsRootVolume from './useIsRootVolume';
import StorageWarningStatus from './StorageWarningStatus';

type StorageTableRowProps = {
  obj: PersistentVolumeClaimKind;
  rowIndex: number;
  onDeletePVC: (pvc: PersistentVolumeClaimKind) => void;
  onEditPVC: (pvc: PersistentVolumeClaimKind) => void;
  onAddPVC: () => void;
};

const StorageTableRow: React.FC<StorageTableRowProps> = ({
  obj,
  rowIndex,
  onDeletePVC,
  onEditPVC,
  onAddPVC,
}) => {
  const [isExpanded, setExpanded] = React.useState(false);
  const isRootVolume = useIsRootVolume(obj);

  const actions: IAction[] = [
    {
      title: 'Edit storage',
      onClick: () => {
        onEditPVC(obj);
      },
    },
  ];

  if (!isRootVolume) {
    actions.push({
      title: 'Delete storage',
      onClick: () => {
        onDeletePVC(obj);
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
              <TableRowTitleDescription title={getPvcDisplayName(obj)} resource={obj} />
            </FlexItem>
            <FlexItem>
              <StorageWarningStatus obj={obj} onEditPVC={onEditPVC} onAddPVC={onAddPVC} />
            </FlexItem>
          </Flex>
          <Text>{getPvcDescription(obj)}</Text>
        </Td>
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
        <Td dataLabel="Connected workbenches">
          <ConnectedNotebookNames
            context={ConnectedNotebookContext.EXISTING_PVC}
            relatedResourceName={obj.metadata.name}
          />
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Size">
          <ExpandableRowContent>
            <strong>Size</strong>
            <StorageSizeBar pvc={obj} />
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
