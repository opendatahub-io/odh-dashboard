import * as React from 'react';
import Table from '~/components/table/Table';
import { RoleBindingKind } from '~/k8sTypes';
import { deleteRoleBinding, generateRoleBindingProjectSharing, createRoleBinding } from '~/api';
import ProjectSharingTableRow from './ProjectSharingTableRow';
import { columnsProjectSharingUser, columnsProjectSharingGroup } from './data';
import { ProjectSharingRBType } from './types';
import { firstSubject } from './utils';

type ProjectSharingTableProps = {
  type: ProjectSharingRBType;
  permissions: RoleBindingKind[];
  typeAhead?: string[];
  onCancel: () => void;
  onError: (error: Error) => void;
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({
  type,
  permissions,
  typeAhead,
  onCancel,
  onError,
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
          isEditing={firstSubject(rb) === '' || editCell.includes(rb.metadata.name)}
          typeAhead={typeAhead}
          onChange={(name, roleType) => {
            const newRBObject = generateRoleBindingProjectSharing(
              rb.metadata.namespace,
              type,
              name,
              roleType,
            );
            if (firstSubject(rb) === '') {
              createRoleBinding(newRBObject)
                .then(() => refresh())
                .catch((e) => {
                  onError(e);
                });
            } else {
              createRoleBinding(newRBObject)
                .then(() =>
                  deleteRoleBinding(rb.metadata.name, rb.metadata.namespace)
                    .then(() => refresh())
                    .catch((e) => {
                      onError(e);
                      setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name));
                    }),
                )
                .catch((e) => {
                  onError(e);
                  setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name));
                });
              refresh();
            }
          }}
          onDelete={() => {
            deleteRoleBinding(rb.metadata.name, rb.metadata.namespace).then(() => refresh());
          }}
          onEdit={() => {
            setEditCell((prev) => [...prev, rb.metadata.name]);
          }}
          onCancel={() => {
            setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name));
            if (firstSubject(rb) === '') {
              onCancel();
            }
          }}
        />
      )}
    />
  );
};
export default ProjectSharingTable;
