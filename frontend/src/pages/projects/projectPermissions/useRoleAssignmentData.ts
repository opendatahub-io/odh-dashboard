import * as React from 'react';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import type { RoleRef } from '#~/concepts/permissions/types';
import {
  buildGroupRoleMap,
  buildUserRoleMap,
  getRoleRefsForSubject,
} from '#~/concepts/permissions/utils';

type UseRoleAssignmentDataResult = {
  existingSubjectNames: string[];
  assignedRolesBySubject: Map<string, RoleRef[]>;
};

export const useRoleAssignmentData = (
  subjectKind: 'user' | 'group',
): UseRoleAssignmentDataResult => {
  const { roleBindings } = usePermissionsContext();

  const subjectRoleMap = React.useMemo(
    () =>
      subjectKind === 'user'
        ? buildUserRoleMap(roleBindings.data)
        : buildGroupRoleMap(roleBindings.data),
    [roleBindings.data, subjectKind],
  );

  const existingSubjectNames = React.useMemo(
    () => Array.from(subjectRoleMap.keys()).toSorted((a, b) => a.localeCompare(b)),
    [subjectRoleMap],
  );

  const assignedRolesBySubject = React.useMemo(() => {
    const kind = subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP;
    const result = new Map<string, RoleRef[]>();
    subjectRoleMap.forEach((roleBindingsForSubject, subjectName) => {
      result.set(
        subjectName,
        getRoleRefsForSubject(roleBindingsForSubject, { kind, name: subjectName }),
      );
    });
    return result;
  }, [subjectKind, subjectRoleMap]);

  return {
    existingSubjectNames,
    assignedRolesBySubject,
  };
};
