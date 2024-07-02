import * as React from 'react';
import { Table } from '~/components/table';
import { RoleBindingKind } from '~/k8sTypes';
import { deleteRoleBinding, generateRoleBindingPermissions, createRoleBinding } from '~/api';
import RoleBindingPermissionsTableRow from './RoleBindingPermissionsTableRow';
import { columnsRoleBindingPermissions } from './data';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';
import { firstSubject } from './utils';
import RoleBindingPermissionsTableRowAdd from './RoleBindingPermissionsTableRowAdd';

type RoleBindingPermissionsTableProps = {
  type: RoleBindingPermissionsRBType;
  projectName: string;
  roleRef?: string;
  labels?: { [key: string]: string };
  permissions: RoleBindingKind[];
  permissionOptions?: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  isAdding: boolean;
  typeAhead?: string[];
  onDismissNewRow: () => void;
  onError: (error: Error) => void;
  refresh: () => void;
};

const RoleBindingPermissionsTable: React.FC<RoleBindingPermissionsTableProps> = ({
  type,
  projectName,
  roleRef,
  labels,
  permissions,
  permissionOptions,
  typeAhead,
  isAdding,
  onDismissNewRow,
  onError,
  refresh,
}) => {
  const [editCell, setEditCell] = React.useState<string[]>([]);
  return (
    <Table
      variant="compact"
      data={permissions}
      data-testid={`role-binding-table ${type}`}
      columns={columnsRoleBindingPermissions}
      disableRowRenderSupport
      footerRow={() =>
        isAdding ? (
          <RoleBindingPermissionsTableRowAdd
            key="add-permission-row"
            type={type}
            permissionOptions={permissionOptions}
            typeAhead={typeAhead}
            onChange={(name, roleType) => {
              const newRBObject = generateRoleBindingPermissions(
                projectName,
                type,
                name,
                roleRef || roleType,
                labels,
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
        <RoleBindingPermissionsTableRow
          key={rb.metadata.name || ''}
          obj={rb}
          type={type}
          isEditing={firstSubject(rb) === '' || editCell.includes(rb.metadata.name)}
          typeAhead={typeAhead}
          onChange={(name, roleType) => {
            const newRBObject = generateRoleBindingPermissions(
              projectName,
              type,
              name,
              roleRef || roleType,
              labels,
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
export default RoleBindingPermissionsTable;
