import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { Text, Title } from '@patternfly/react-core';
import { getPvcDescription, getPvcDisplayName, getPvcRelatedNotebooks } from '../../../utils';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import { HddIcon } from '@patternfly/react-icons';
import StorageSizeBar from '../../../components/StorageSizeBars';
import ConnectedWorkspaces from '../../../notebook/ConnectedWorkspaces';

type StorageTableRowProps = {
  obj: PersistentVolumeClaimKind;
  onDeletePVC: (pvc: PersistentVolumeClaimKind) => void;
  onEditPVC: (pvc: PersistentVolumeClaimKind) => void;
};

const StorageTableRow: React.FC<StorageTableRowProps> = ({ obj, onDeletePVC, onEditPVC }) => {
  const [isExpanded, setExpanded] = React.useState<boolean>(false);

  return (
    <>
      <Tr>
        <Td expand={{ rowIndex: 0, isExpanded, onToggle: () => setExpanded(!isExpanded) }} />
        <Td>
          <Title headingLevel="h4">{getPvcDisplayName(obj)}</Title>
          <Text>{getPvcDescription(obj)}</Text>
        </Td>
        <Td>
          <Text>
            <HddIcon />
            {` Persistent storage`}
          </Text>
        </Td>
        <Td>
          <ConnectedWorkspaces connectedAnnotation={getPvcRelatedNotebooks(obj)} />
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit storage',
                onClick: () => {
                  onEditPVC(obj);
                },
              },
              {
                title: 'Delete storage',
                onClick: () => {
                  onDeletePVC(obj);
                },
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td>
          <ExpandableRowContent>
            <strong>Size</strong>
            <StorageSizeBar pvc={obj} />
          </ExpandableRowContent>
        </Td>
        <Td />
        <Td />
        <Td />
      </Tr>
    </>
  );
};

export default StorageTableRow;
