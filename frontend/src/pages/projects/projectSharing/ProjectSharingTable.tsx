import * as React from 'react';
import Table from '~/components/table/Table';
import { RoleBindingKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { deleteRoleBinding, generateRoleBindingProjectSharing, createRoleBinding } from '~/api';
import ProjectSharingTableRow from './ProjectSharingTableRow';
import { columnsProjectSharing } from './data';
import { ProjectSharingRBType } from './types';
import { firstSubject } from './utils';
import ProjectSharingTableRowAdd from './ProjectSharingTableRowAdd';

type ProjectSharingTableProps = {
  type: ProjectSharingRBType;
  permissions: RoleBindingKind[];
  isAdding: boolean;
  typeAhead?: string[];
  onDismissNewRow: () => void;
  onError: (error: Error) => void;
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({
  type,
  permissions,
  typeAhead,
  isAdding,
  onDismissNewRow,
  onError,
  refresh,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [editCell, setEditCell] = React.useState<string[]>([]);

  return (
    <Table
      variant="compact"
      data={permissions}
      columns={columnsProjectSharing}
      disableRowRenderSupport
      footerRow={() =>
        isAdding ? (
          <ProjectSharingTableRowAdd
            key={'add-permission-row'}
            typeAhead={typeAhead}
            onChange={(name, roleType) => {
              const newRBObject = generateRoleBindingProjectSharing(
                currentProject.metadata.name,
                type,
                name,
                roleType,
              );
              createRoleBinding(newRBObject)
                .then(() => {
                  onDismissNewRow();
                  refresh();
                })
                .catch((e) => {
                  onError(e);
                });
            }}
            onCancel={onDismissNewRow}
          />
        ) : null
      }
      rowRenderer={(rb) => (
        <ProjectSharingTableRow
          key={rb.metadata?.name || ''}
          obj={rb}
          isEditing={firstSubject(rb) === '' || editCell.includes(rb.metadata.name)}
          typeAhead={typeAhead}
          onChange={(name, roleType) => {
            const newRBObject = generateRoleBindingProjectSharing(
              currentProject.metadata.name,
              type,
              name,
              roleType,
            );
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
          }}
          onDelete={() => {
            deleteRoleBinding(rb.metadata.name, rb.metadata.namespace).then(() => refresh());
          }}
          onEdit={() => {
            setEditCell((prev) => [...prev, rb.metadata.name]);
          }}
          onCancel={() => {
            setEditCell((prev) => prev.filter((cell) => cell !== rb.metadata.name));
          }}
        />
      )}
    />
  );
};
export default ProjectSharingTable;
