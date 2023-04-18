import * as React from 'react';
import Table from '~/components/Table';
import { RoleBindingKind } from '~/k8sTypes';
import { deleteRoleBinding, generateRoleBindingProjectSharing, createRoleBinding } from '~/api';
import ProjectSharingTableRow from './ProjectSharingTableRow';
import { columnsProjectSharingUser, columnsProjectSharingGroup } from './data';
import { ProjectSharingRBType } from './types';

type ProjectSharingTableProps = {
  type: ProjectSharingRBType;
  permissions: RoleBindingKind[];
  onCancel: () => void;
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({
  type,
  permissions,
  onCancel,
  refresh,
}) => (
  <Table
    variant="compact"
    data={permissions}
    columns={
      type === ProjectSharingRBType.USER ? columnsProjectSharingUser : columnsProjectSharingGroup
    }
    disableRowRenderSupport
    rowRenderer={(rb) => (
      <ProjectSharingTableRow
        key={rb.metadata?.name || ''}
        obj={rb}
        isEditing={rb.subjects[0]?.name === ''}
        onCreateRoleBinding={(name, roleType) => {
          const newRBObject = generateRoleBindingProjectSharing(
            rb.metadata.namespace,
            type,
            name,
            roleType,
          );
          createRoleBinding(newRBObject).then(() => refresh());
        }}
        onDeleteRoleBinding={(obj) => {
          deleteRoleBinding(obj.metadata.name, obj.metadata.namespace).then(() => refresh());
        }}
        onCancelRoleBindingCreation={onCancel}
      />
    )}
  />
);

export default ProjectSharingTable;
