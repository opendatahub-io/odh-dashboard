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
  typeAhead: string[];
  onCancel: () => void;
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({
  type,
  permissions,
  typeAhead,
  onCancel,
  refresh,
}) => {
  const [editCell, setEditCell] = React.useState<string[]>([]);

  return (
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
          isEditing={rb.subjects[0]?.name === '' || editCell.includes(rb.metadata.name)}
          typeAhead={typeAhead}
          onCreateOrEditRoleBinding={(name, roleType, obj) => {
            const newRBObject = generateRoleBindingProjectSharing(
              obj.metadata.namespace,
              type,
              name,
              roleType,
            );
            if (obj.subjects[0]?.name === '') {
              createRoleBinding(newRBObject)
                .then(() => refresh())
                .catch(() =>
                  setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name)),
                );
            } else {
              createRoleBinding(newRBObject)
                .then(() =>
                  deleteRoleBinding(obj.metadata.name, obj.metadata.namespace).then(() =>
                    refresh(),
                  ),
                )
                .catch(() =>
                  setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name)),
                );
              refresh();
            }
          }}
          onDeleteRoleBinding={(obj) => {
            deleteRoleBinding(obj.metadata.name, obj.metadata.namespace).then(() => refresh());
          }}
          onEditRoleBinding={(obj) => {
            setEditCell((prev) => [...prev, obj.metadata.name]);
          }}
          onCancelRoleBindingCreation={() => {
            setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name));
            onCancel();
          }}
        />
      )}
    />
  );
};
export default ProjectSharingTable;
