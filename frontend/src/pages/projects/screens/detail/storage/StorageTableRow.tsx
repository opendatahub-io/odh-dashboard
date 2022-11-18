import * as React from 'react';
import {
  ActionsColumn,
  ExpandableRowContent,
  IAction,
  Tbody,
  Td,
  Tr,
} from '@patternfly/react-table';
import { Text, Title } from '@patternfly/react-core';
import { getPvcDescription, getPvcDisplayName } from '../../../utils';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import { HddIcon } from '@patternfly/react-icons';
import StorageSizeBar from '../../../components/StorageSizeBars';
import ConnectedNotebookNames from '../../../notebook/ConnectedNotebookNames';
import { ConnectedNotebookContext } from '../../../notebook/useRelatedNotebooks';
import ResourceNameTooltip from '../../../components/ResourceNameTooltip';
import useIsRootVolume from './useIsRootVolume';

type StorageTableRowProps = {
  obj: PersistentVolumeClaimKind;
  onDeletePVC: (pvc: PersistentVolumeClaimKind) => void;
  onEditPVC: (pvc: PersistentVolumeClaimKind) => void;
};

const StorageTableRow: React.FC<StorageTableRowProps> = ({ obj, onDeletePVC, onEditPVC }) => {
  const [isExpanded, setExpanded] = React.useState<boolean>(false);
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
      <Tr>
        <Td expand={{ rowIndex: 0, isExpanded, onToggle: () => setExpanded(!isExpanded) }} />
        <Td dataLabel="Name">
          <Title headingLevel="h4">
            <ResourceNameTooltip resource={obj}>{getPvcDisplayName(obj)}</ResourceNameTooltip>
          </Title>
          <Text>{getPvcDescription(obj)}</Text>
        </Td>
        <Td dataLabel="Type">
          <Text>
            <HddIcon />
            {` Persistent storage`}
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
