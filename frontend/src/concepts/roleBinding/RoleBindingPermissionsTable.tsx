import * as React from 'react';
import { K8sResourceCommon, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { Table } from '~/components/table';
import { RoleBindingKind, RoleBindingRoleRef, RoleBindingSubject } from '~/k8sTypes';
import { generateRoleBindingPermissions } from '~/api';
import RoleBindingPermissionsTableRow from './RoleBindingPermissionsTableRow';
import { columnsRoleBindingPermissions } from './data';
import { RoleBindingPermissionsRoleType } from './types';
import { firstSubject } from './utils';

type RoleBindingPermissionsTableProps = {
  ownerReference?: K8sResourceCommon;
  subjectKind: RoleBindingSubject['kind'];
  namespace: string;
  roleRefKind: RoleBindingRoleRef['kind'];
  roleRefName?: RoleBindingRoleRef['name'];
  labels?: { [key: string]: string };
  isProjectSubject?: boolean;
  defaultRoleBindingName?: string;
  permissions: RoleBindingKind[];
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  isAdding: boolean;
  typeAhead?: string[];
  createRoleBinding: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
  deleteRoleBinding: (name: string, namespace: string) => Promise<K8sStatus>;
  onDismissNewRow: () => void;
  onError: (error: React.ReactNode) => void;
  refresh: () => void;
};

const RoleBindingPermissionsTable: React.FC<RoleBindingPermissionsTableProps> = ({
  ownerReference,
  subjectKind,
  namespace,
  roleRefKind,
  roleRefName,
  labels,
  defaultRoleBindingName,
  permissions,
  permissionOptions,
  typeAhead,
  isProjectSubject,
  isAdding,
  createRoleBinding,
  deleteRoleBinding,
  onDismissNewRow,
  onError,
  refresh,
}) => {
  const [editCell, setEditCell] = React.useState<string[]>([]);
  const createProjectRoleBinding = (
    subjectName: string,
    newRBObject: RoleBindingKind,
    oldRBObject?: RoleBindingKind,
  ) => {
    const roleType = newRBObject.subjects[0].kind.toLowerCase();
    const usedNames: string[] = permissions
      .map((p) => p.subjects[0].name)
      .filter((name) => isAdding || name !== oldRBObject?.subjects[0].name);
    const isDuplicateName = usedNames.includes(subjectName);
    if (isDuplicateName) {
      // Prevent duplicate role binding
      onError(
        <>
          The {roleType} <strong>{subjectName}</strong> already exists. Edit the {roleType}
          &apos;s existing permissions, or add a new {roleType} to assign it permissions.
        </>,
      );
      refresh();
    } else if (isAdding) {
      // Add new role binding
      createRoleBinding(newRBObject)
        .then(() => {
          onDismissNewRow();
          refresh();
        })
        .catch((e) => {
          onError(<>{e}</>);
        });
    } else {
      // Edit existing role binding
      createRoleBinding(newRBObject)
        .then(() => {
          if (oldRBObject) {
            deleteRoleBinding(oldRBObject.metadata.name, oldRBObject.metadata.namespace)
              .then(() => refresh())
              .catch((e) => {
                onError(<>{e}</>);
                setEditCell((prev) => prev.filter((cell) => cell !== oldRBObject.metadata.name));
              });
          }
        })
        .then(() => {
          onDismissNewRow();
          refresh();
        })
        .catch((e) => {
          onError(<>{e}</>);
          setEditCell((prev) => prev.filter((cell) => cell !== oldRBObject?.metadata.name));
        });
    }
  };
  return (
    <Table
      variant="compact"
      data={permissions}
      data-testid={`role-binding-table ${subjectKind}`}
      columns={columnsRoleBindingPermissions}
      disableRowRenderSupport
      footerRow={() =>
        isAdding ? (
          <RoleBindingPermissionsTableRow
            key="add-permissions-row"
            subjectKind={subjectKind}
            permissionOptions={permissionOptions}
            isProjectSubject={isProjectSubject}
            typeAhead={typeAhead}
            isEditing={false}
            isAdding
            onChange={(subjectName, rbRoleRefName) => {
              const newRBObject = generateRoleBindingPermissions(
                namespace,
                subjectKind,
                subjectName,
                roleRefName || rbRoleRefName,
                roleRefKind,
                labels,
                ownerReference,
              );
              createProjectRoleBinding(subjectName, newRBObject);
            }}
            onCancel={onDismissNewRow}
          />
        ) : null
      }
      rowRenderer={(rb) => (
        <RoleBindingPermissionsTableRow
          isProjectSubject={isProjectSubject}
          defaultRoleBindingName={defaultRoleBindingName}
          key={rb.metadata.name || ''}
          permissionOptions={permissionOptions}
          roleBindingObject={rb}
          subjectKind={subjectKind}
          isEditing={
            firstSubject(rb, isProjectSubject) === '' || editCell.includes(rb.metadata.name)
          }
          isAdding={false}
          typeAhead={typeAhead}
          onChange={(subjectName, rbRoleRefName) => {
            const newRBObject = generateRoleBindingPermissions(
              namespace,
              subjectKind,
              subjectName,
              roleRefName || rbRoleRefName,
              roleRefKind,
              labels,
              ownerReference,
            );
            createProjectRoleBinding(subjectName, newRBObject, rb);
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
            onDismissNewRow();
          }}
        />
      )}
    />
  );
};
export default RoleBindingPermissionsTable;
