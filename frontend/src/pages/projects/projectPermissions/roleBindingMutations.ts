import type { RoleBindingKind, RoleBindingSubject } from '#~/k8sTypes';
import {
  createRoleBinding,
  deleteRoleBinding,
  generateRoleBindingPermissions,
  patchRoleBindingSubjects,
} from '#~/api';
import { KnownLabels } from '#~/k8sTypes';
import type { RoleRef, SupportedSubjectKind } from '#~/concepts/permissions/types';

export const buildRoleBindingSubject = (
  subjectKind: SupportedSubjectKind,
  subjectName: string,
): RoleBindingSubject => ({
  kind: subjectKind,
  apiGroup: 'rbac.authorization.k8s.io',
  name: subjectName,
});

type FindRoleBindingForRoleRefArgs = {
  roleBindings: RoleBindingKind[];
  namespace: string;
  roleRef: RoleRef;
};

// Returns the first RoleBinding that matches the given namespace + roleRef.
// Note: multiple RoleBindings can point to the same roleRef; callers should be explicit about how
// they choose which RoleBinding to patch.
export const findRoleBindingForRoleRef = ({
  roleBindings,
  namespace,
  roleRef,
}: FindRoleBindingForRoleRefArgs): RoleBindingKind | undefined =>
  roleBindings.find(
    (rb) =>
      rb.metadata.namespace === namespace &&
      rb.roleRef.kind === roleRef.kind &&
      rb.roleRef.name === roleRef.name,
  );

export const roleBindingHasSubject = (rb: RoleBindingKind, subject: RoleBindingSubject): boolean =>
  (rb.subjects ?? []).some((s) => s.kind === subject.kind && s.name === subject.name);

type EnsureSubjectHasRoleBindingArgs = {
  roleBindings: RoleBindingKind[];
  namespace: string;
  subjectKind: SupportedSubjectKind;
  subject: RoleBindingSubject;
  roleRef: RoleRef;
};

// Ensures the subject is assigned to the desired RoleRef by patching an existing RoleBinding (if any)
// or creating a new RoleBinding when none exists.
export const ensureSubjectHasRoleBinding = async ({
  roleBindings,
  namespace,
  subjectKind,
  subject,
  roleRef,
}: EnsureSubjectHasRoleBindingArgs): Promise<void> => {
  const matches = roleBindings.filter(
    (rb) =>
      rb.metadata.namespace === namespace &&
      rb.roleRef.kind === roleRef.kind &&
      rb.roleRef.name === roleRef.name,
  );

  // If the subject is already assigned via ANY RoleBinding for this roleRef, don't patch/create.
  if (matches.some((rb) => roleBindingHasSubject(rb, subject))) {
    return;
  }

  // Otherwise patch the first matching RoleBinding (if any) or create a new one.
  const existing = matches.length > 0 ? matches[0] : undefined;
  if (!existing) {
    const rb = generateRoleBindingPermissions(
      namespace,
      subjectKind,
      subject.name,
      roleRef.name,
      roleRef.kind,
      { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    );
    await createRoleBinding(rb);
    return;
  }

  const subjects = existing.subjects ?? [];
  await patchRoleBindingSubjects(existing.metadata.name, namespace, [...subjects, subject]);
};

type RemoveSubjectFromRoleBindingArgs = {
  namespace: string;
  roleBinding: RoleBindingKind;
  subject: RoleBindingSubject;
};

// Removes the subject from the given RoleBinding.
// If the RoleBinding would become empty, delete it instead.
export const removeSubjectFromRoleBinding = async ({
  namespace,
  roleBinding,
  subject,
}: RemoveSubjectFromRoleBindingArgs): Promise<void> => {
  // Safety guard: don't mutate (or delete) a RoleBinding if it doesn't actually contain the subject.
  if (!roleBindingHasSubject(roleBinding, subject)) {
    return;
  }

  const subjects = roleBinding.subjects ?? [];
  const remaining = subjects.filter((s) => !(s.kind === subject.kind && s.name === subject.name));

  if (remaining.length === 0) {
    await deleteRoleBinding(roleBinding.metadata.name, namespace);
    return;
  }

  await patchRoleBindingSubjects(roleBinding.metadata.name, namespace, remaining);
};

type MoveSubjectRoleBindingArgs = {
  roleBindings: RoleBindingKind[];
  namespace: string;
  subjectKind: SupportedSubjectKind;
  subject: RoleBindingSubject;
  fromRoleBinding: RoleBindingKind;
  toRoleRef: RoleRef;
};

// Moves a single subject from one RoleBinding to another roleRef in a subject-scoped way:
// 1) Add subject to the target roleRef (patch existing RB or create a new RB)
// 2) Remove subject from the source RB (patch subjects or delete RB if it becomes empty)
export const moveSubjectRoleBinding = async ({
  roleBindings,
  namespace,
  subjectKind,
  subject,
  fromRoleBinding,
  toRoleRef,
}: MoveSubjectRoleBindingArgs): Promise<void> => {
  await ensureSubjectHasRoleBinding({
    roleBindings,
    namespace,
    subjectKind,
    subject,
    roleRef: toRoleRef,
  });
  await removeSubjectFromRoleBinding({ namespace, roleBinding: fromRoleBinding, subject });
};
