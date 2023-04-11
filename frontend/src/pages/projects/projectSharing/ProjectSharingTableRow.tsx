import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  DropdownDirection,
  Flex,
  FlexItem,
  Icon,
  Spinner,
  Text,
  TextVariants,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { RoleBindingKind } from '~/k8sTypes';
import { formatDate } from './utils';

type ProjectSharingTableRowProps = {
  obj: RoleBindingKind;
  rowIndex: number;
  onEditRoleBinding: (rolebinding: RoleBindingKind) => void;
  onDeleteRoleBinding: (rolebinding: RoleBindingKind) => void;
};

const ProjectSharingTableRow: React.FC<ProjectSharingTableRowProps> = ({
  obj,
  rowIndex,
  onEditRoleBinding,
  onDeleteRoleBinding,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          <Text>{obj.subjects[0]?.name}</Text>
        </Td>
        <Td dataLabel="Permission">
          <Text> {obj.roleRef.name}</Text>
        </Td>
        <Td dataLabel="Date added">
          <Text>{obj.metadata?.creationTimestamp ? formatDate(obj.metadata?.creationTimestamp) : ''}</Text>
        </Td>
        <Td isActionCell>
      <ActionsColumn
        dropdownDirection={DropdownDirection.up}
        items={[
          {
            title: 'Edit',
            onClick: () => {
              onEditRoleBinding(obj);
            },
          },
          {
            title: 'Delete',
            onClick: () => {
              onDeleteRoleBinding(obj);
            },
          },
        ]}
      />
    </Td>
      </Tr>
    </Tbody>
  );
};

export default ProjectSharingTableRow;
